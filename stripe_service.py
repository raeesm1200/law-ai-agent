"""
Stripe service for handling payments and subscriptions
"""

import os
import stripe
from typing import Optional, Dict, Any
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

class StripeService:
    def __init__(self):
        self.publishable_key = os.getenv("STRIPE_PUBLISHABLE_KEY")
        self.secret_key = os.getenv("STRIPE_SECRET_KEY")
        self.webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        self.monthly_price_id = os.getenv("STRIPE_MONTHLY_PRICE_ID")
        self.yearly_price_id = os.getenv("STRIPE_YEARLY_PRICE_ID")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        
        if not self.secret_key:
            raise ValueError("STRIPE_SECRET_KEY environment variable is required")
    
    def create_customer(self, email: str, name: Optional[str] = None) -> stripe.Customer:
        """Create a new Stripe customer"""
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata={"source": "law-ai-chatbot"}
            )
            return customer
        except Exception as e:
            raise Exception(f"Failed to create Stripe customer: {str(e)}")
    
    def create_checkout_session(
        self, 
        customer_id: str, 
        plan_type: str,
        user_id: int
    ) -> stripe.checkout.Session:
        """Create a Stripe Checkout Session for subscription"""
        try:
            # Determine price ID based on plan type
            if plan_type == "monthly":
                price_id = self.monthly_price_id
            elif plan_type == "yearly":
                price_id = self.yearly_price_id
            else:
                raise ValueError("Invalid plan type. Must be 'monthly' or 'yearly'")
            
            if not price_id:
                raise ValueError(f"Price ID not configured for {plan_type} plan")
            
            # Log the parameters we're sending to Stripe
            print(f"🔍 Creating Stripe checkout session with:")
            print(f"   customer_id: {customer_id}")
            print(f"   price_id: {price_id}")
            print(f"   plan_type: {plan_type}")
            print(f"   user_id: {user_id}")
            print(f"   frontend_url: {self.frontend_url}")
            
            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=f"{self.frontend_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{self.frontend_url}/subscription/cancel",
                # Session-level metadata
                metadata={
                    "user_id": str(user_id),
                    "plan_type": plan_type,
                },
                # 👇 Subscription-level metadata (this is what invoices/webhooks see)
                subscription_data={
                    "metadata": {
                        "user_id": str(user_id),
                        "plan_type": plan_type,
                        "created_by_user_id": str(user_id),
                    }
                }
            )
            print(f"✅ Created checkout session: {session.id}")
            print(f"   Session URL: {session.url}")
            print(f"   Customer: {session.customer}")
            print(f"   Mode: {session.mode}")
            print(f"   Status: {session.status}")
            return session
        except Exception as e:
            raise Exception(f"Failed to create checkout session: {str(e)}")
    
    def create_billing_portal_session(self, customer_id: str) -> stripe.billing_portal.Session:
        """Create a billing portal session for customer to manage subscription"""
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=f"{self.frontend_url}/subscription"
            )
            return session
        except Exception as e:
            raise Exception(f"Failed to create billing portal session: {str(e)}")
    
    def get_subscription(self, subscription_id: str) -> stripe.Subscription:
        """Get subscription details from Stripe"""
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            return subscription
        except Exception as e:
            raise Exception(f"Failed to retrieve subscription: {str(e)}")
    
    def cancel_subscription(self, subscription_id: str, immediate: bool = True) -> stripe.Subscription:
        """Cancel a subscription.

        If `immediate` is True, the subscription is deleted immediately. If False,
        the subscription is scheduled to cancel at the end of the current billing period
        (cancel_at_period_end=True).
        """
        try:
            if immediate:
                subscription = stripe.Subscription.delete(subscription_id)
            else:
                subscription = stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True
                )
            return subscription
        except Exception as e:
            raise Exception(f"Failed to cancel subscription: {str(e)}")
    
    def construct_webhook_event(self, payload: bytes, sig_header: str) -> stripe.Event:
        """Construct and verify webhook event"""
        try:
            # For development mode without webhook secret, parse without verification
            if not self.webhook_secret:
                import json
                event_data = json.loads(payload.decode())
                event = stripe.Event.construct_from(event_data, stripe.api_key)
                print("⚠️ Webhook processed WITHOUT signature verification (development mode)")
                return event
            
            # Production mode with signature verification
            event = stripe.Webhook.construct_event(
                payload, sig_header, self.webhook_secret
            )
            print("✅ Webhook signature verified")
            return event
        except ValueError as e:
            raise ValueError(f"Invalid payload: {str(e)}")
        except stripe.error.SignatureVerificationError as e:
            raise ValueError(f"Invalid signature: {str(e)}")
    
    def get_customer(self, customer_id: str) -> stripe.Customer:
        """Get customer details from Stripe"""
        try:
            customer = stripe.Customer.retrieve(customer_id)
            return customer
        except Exception as e:
            raise Exception(f"Failed to retrieve customer: {str(e)}")
    
    def get_price_info(self, plan_type: str) -> Dict[str, Any]:
        """Get price information for a plan"""
        try:
            if plan_type == "monthly":
                price_id = self.monthly_price_id
            elif plan_type == "yearly":
                price_id = self.yearly_price_id
            else:
                raise ValueError("Invalid plan type")
            
            if not price_id:
                raise ValueError(f"Price ID not configured for {plan_type} plan")
            
            price = stripe.Price.retrieve(price_id)
            return {
                "id": price.id,
                "amount": price.unit_amount,
                "currency": price.currency,
                "interval": price.recurring.interval if price.recurring else None,
                "interval_count": price.recurring.interval_count if price.recurring else None
            }
        except Exception as e:
            raise Exception(f"Failed to get price info: {str(e)}")

# Create a global instance
stripe_service = StripeService()
