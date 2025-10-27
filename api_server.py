
#!/usr/bin/env python3
"""
FastAPI backend for Legal RAG Chatbot with Stripe Subscription Integration
Serves the existing legal_rag_chatbot.py functionality via REST API with user authentication and payments
"""

import os
import sys
import uuid
import asyncio
import traceback
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import get_db, create_tables
from models import User, Subscription, ChatHistory
from models import ProcessedWebhookEvent
from legal_rag_chatbot import LegalRAGChatbot
from schemas import (
    UserCreate, UserLogin, UserResponse, Token, ChatRequest, ChatResponse,
    CreateCheckoutSessionRequest, CreateCheckoutSessionResponse,
    BillingPortalResponse, HealthResponse, ClearHistoryRequest
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_active_user, check_subscription, ACCESS_TOKEN_EXPIRE_MINUTES
)
from stripe_service import get_stripe_service
import logging


from fastapi_mail import FastMail, MessageSchema, ConnectionConfig





from jose import jwt
from starlette.background import BackgroundTasks

SECRET_KEY = os.getenv("SECRET_KEY", "changeme")
ALGORITHM = "HS256"

def create_password_reset_token(email: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=1)
    to_encode = {"sub": email, "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def send_reset_email(email: str, token: str):
    reset_link = f"https://onir.world/reset-password?token={token}"
    template_path = os.path.join(os.path.dirname(__file__), "templates", "password_reset_email.html")
    with open(template_path, "r", encoding="utf-8") as f:
        html = f.read().replace("{{RESET_LINK}}", reset_link)
    message = MessageSchema(
        subject="Password Reset Request",
        recipients=[email],
        body=html,
        subtype="html"
    )
    await fast_mail.send_message(message)


# Utility function for timezone-aware conversion
def _to_utc_aware(dt):
    if not dt:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc)
    return dt.replace(tzinfo=timezone.utc)

# Password reset schemas (must be after BaseModel/EmailStr import)
from pydantic import BaseModel, EmailStr
class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr
from dotenv import load_dotenv
load_dotenv()

mail_conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 465)),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_STARTTLS=os.getenv("MAIL_STARTTLS", "False").lower() == "true",
    MAIL_SSL_TLS=os.getenv("MAIL_SSL_TLS", "True").lower() == "true",
    MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "Onir World"),
)
fast_mail = FastMail(mail_conf)


def require_stripe_service():
    """Raise a FastAPI HTTPException if stripe_service is not initialized."""
    try:
        get_stripe_service()
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

logger = logging.getLogger("legal_rag_api")
# Do not change global logging level here; use debug-level logs so they are hidden by default.

from pydantic import BaseModel
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

# Global chatbot instance
chatbot: Optional[LegalRAGChatbot] = None
chat_histories: Dict[str, list] = {}  # conversation_id -> chat history

DISABLE_SUBSCRIPTION = os.getenv("DISABLE_SUBSCRIPTION", "false").lower() == "true"

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup the chatbot and database"""
    global chatbot
    try:
        print("🚀 Initializing Legal RAG Chatbot with Stripe integration...")

        # Create database tables
        create_tables()
        print("✅ Database tables created successfully!")

        # Initialize chatbot
        chatbot = LegalRAGChatbot()
        print("✅ Chatbot initialized successfully!")

        yield
    except Exception as e:
        print(f"❌ Failed to initialize application: {e}")
        sys.exit(1)
    finally:
        print("🔄 Shutting down application...")

# FastAPI app with lifespan management
app = FastAPI(
    title="Legal RAG Chatbot API with Stripe",
    description="REST API for Italian Legal Assistant with Subscription Management",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://law-ai-agent-1.onrender.com",
        "https://*.render.com",
        "https://*.modal.run",
        "https://*.vercel.app",
        "https://*.netlify.app",
        "https://onir.world/lawagentai",
        "https://onir.world",
        "https://lawagentai.onir.world",
        "https://voluble-caramel-c5e892.netlify.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# =============================================================================
# AUTHENTICATION ENDPOINTS
# =============================================================================

# =============================================================================
# PASSWORD RESET ENDPOINTS (must be after app and schemas)
# =============================================================================

from fastapi import BackgroundTasks

@app.post("/api/auth/request-password-reset")
async def request_password_reset(request: PasswordResetRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Request a password reset email"""
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # Do not reveal whether the email exists
        return {"message": "If the email exists, a reset link has been sent."}
    token = create_password_reset_token(user.email)
    background_tasks.add_task(send_reset_email, user.email, token)
    return {"message": "If the email exists, a reset link has been sent."}

@app.post("/api/auth/reset-password")
async def reset_password(data: PasswordResetConfirm, db: Session = Depends(get_db)):
    """Reset password using token"""
    try:
        payload = jwt.decode(data.token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=400, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = get_password_hash(data.new_password)
    db.add(user)
    db.commit()
    return {"message": "Password reset successful"}

@app.post("/api/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create Stripe customer
    try:
        require_stripe_service()
        stripe_customer = get_stripe_service().create_customer(
            email=user_data.email,
            name=user_data.email.split('@')[0]
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create payment profile: {str(e)}"
        )
    
    # Create user in database
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        stripe_customer_id=stripe_customer.id
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@app.post("/api/auth/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Login user and return JWT token"""
    user = db.query(User).filter(User.email == user_data.email).first()
    
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user

@app.get("/api/auth/debug")
async def debug_auth(request: Request, db: Session = Depends(get_db)):
    """Debug authentication - shows token status and user info"""
    auth_header = request.headers.get('authorization')
    
    debug_info = {
        "auth_header_present": bool(auth_header),
        "auth_header_format": "Bearer <token>" if auth_header and auth_header.startswith('Bearer ') else "Invalid format" if auth_header else "Missing",
        "timestamp": datetime.now().isoformat()
    }
    
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        # Do NOT include token length/prefix or any token material in debug output
        try:
            from auth import verify_token
            email = verify_token(token)
            if email:
                debug_info["token_valid"] = True
                # email is OK to return for debugging, but avoid any token data
                debug_info["user_email"] = email

                user = db.query(User).filter(User.email == email).first()
                if user:
                    debug_info["user_found"] = True
                    debug_info["user_id"] = user.id
                    debug_info["user_active"] = user.is_active

                    # Check subscriptions (only structural data, no secrets)
                    subscriptions = db.query(Subscription).filter(Subscription.user_id == user.id).all()
                    debug_info["subscription_count"] = len(subscriptions)
                    debug_info["active_subscriptions"] = [
                        {
                            "id": sub.id,
                            "status": sub.status,
                            "plan_type": sub.plan_type
                        }
                        for sub in subscriptions if sub.status == "active"
                    ]
                else:
                    debug_info["user_found"] = False
            else:
                debug_info["token_valid"] = False
        except Exception as e:
            # Avoid leaking exception internals that might include secrets
            debug_info["token_error"] = "verification_failed"
    return debug_info

# =============================================================================
# SUBSCRIPTION ENDPOINTS
# =============================================================================


class GoogleLoginRequest(BaseModel):
    id_token: str


@app.post("/api/auth/google", response_model=Token)
async def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    """Verify Google id_token, create or find user, and return JWT token"""
    try:
        CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
        if not CLIENT_ID:
            # Provide a clear error for missing server config
            raise RuntimeError('GOOGLE_CLIENT_ID not set on server environment')

        # Verify token and audience
        idinfo = google_id_token.verify_oauth2_token(payload.id_token, google_requests.Request(), CLIENT_ID)

        email = idinfo.get('email')
        if not email:
            raise RuntimeError('Verified Google token did not contain an email')

        # Find or create user
        user = db.query(User).filter(User.email == email).first()
        if not user:
            # Create Stripe customer
            require_stripe_service()
            stripe_customer = get_stripe_service().create_customer(email=email, name=email.split('@')[0])

            # Generate a random internal password and store its hash so NOT NULL constraint is satisfied.
            random_pw = uuid.uuid4().hex
            hashed_pw = get_password_hash(random_pw)
            user = User(email=email, hashed_password=hashed_pw, stripe_customer_id=stripe_customer.id)
            db.add(user)
            db.commit()
            db.refresh(user)

        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)

        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        # Re-raise FastAPI HTTP exceptions
        raise
    except Exception as e:
        # Log the full exception server-side for debugging
        import traceback
        print("❌ Error in /api/auth/google:")
        traceback.print_exc()
        # Return a controlled 500 error with a helpful message
        raise HTTPException(status_code=500, detail=f"Google login failed: {str(e)}")

@app.post("/api/subscription/create-checkout-session", response_model=CreateCheckoutSessionResponse)
async def create_checkout_session(
    request: CreateCheckoutSessionRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a Stripe checkout session for subscription"""
    try:
        # Ensure user has a Stripe customer id
        require_stripe_service()
        if not current_user.stripe_customer_id:
            try:
                stripe_customer = get_stripe_service().create_customer(email=current_user.email, name=current_user.email.split('@')[0])
                current_user.stripe_customer_id = stripe_customer.id
                db.add(current_user)
                db.commit()
            except Exception as e:
                raise Exception(f"Failed to create Stripe customer for user: {str(e)}")

        session = get_stripe_service().create_checkout_session(
            customer_id=current_user.stripe_customer_id,
            plan_type=request.plan_type,
            user_id=current_user.id
        )

        return CreateCheckoutSessionResponse(
            session_id=session.id,
            session_url=session.url
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create checkout session: {str(e)}"
        )

@app.get("/api/subscription/billing-portal", response_model=BillingPortalResponse)
@app.post("/api/subscription/billing-portal", response_model=BillingPortalResponse)
async def create_billing_portal_session(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a Stripe billing portal session.

    Behavior:
    - Only allow access if the user has a subscription (active or canceled but not expired).
    - If the user lacks a stored Stripe customer id, attempt to derive it from the user's
      subscription (local DB record or Stripe subscription lookup) and persist it.
    """
    try:
        # Ensure user has a local subscription record first
        local_sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).order_by(Subscription.end_date.desc()).first()
        if not local_sub:
            # No subscription locally — deny access to billing portal
            raise HTTPException(status_code=403, detail="No subscription found for user. Only subscribers can access the billing portal.")

        # Prefer stored customer id
        customer_id = current_user.stripe_customer_id

        # If missing, try to derive from the subscription record (stripe_subscription_id)
        if not customer_id and local_sub and local_sub.stripe_subscription_id:
            try:
                try:
                    stripe_sub = get_stripe_service().get_subscription(local_sub.stripe_subscription_id)
                    customer_id = getattr(stripe_sub, 'customer', None) or stripe_sub.get('customer')
                    if customer_id:
                        # persist for future use
                        current_user.stripe_customer_id = customer_id
                        db.add(current_user)
                        db.commit()
                except Exception as e:
                    print(f"⚠️ Could not derive customer from subscription {local_sub.stripe_subscription_id}: {e}")
            except Exception as e:
                # Log and continue to allow a helpful error below
                print(f"⚠️ Could not derive customer from subscription {local_sub.stripe_subscription_id}: {e}")

        if not customer_id:
            raise HTTPException(status_code=400, detail="Stripe customer id not found for user. Cannot open billing portal.")

        try:
            require_stripe_service()
            session = get_stripe_service().create_billing_portal_session(customer_id)
            return BillingPortalResponse(portal_url=session.url)
        except Exception as e:
            err_msg = str(e)
            print(f"❌ Stripe billing portal error: {err_msg}")
            # Detect common Billing Portal misconfiguration message and return helpful guidance
            if 'No configuration provided' in err_msg or 'test mode default configuration has not been created' in err_msg:
                raise HTTPException(
                    status_code=503,
                    detail=(
                        "Stripe Billing Portal is not configured for this account. "
                        "Enable and save the Customer Portal settings in your Stripe Dashboard (test mode) at: "
                        "https://dashboard.stripe.com/test/settings/billing/portal. "
                        "As an alternative for now, you can cancel subscriptions via the API endpoint /api/subscription/cancel"
                    )
                )
            # Re-raise for other errors
            raise
    except HTTPException:
        # re-raise FastAPI HTTP exceptions
        raise
    except Exception as e:
        print(f"❌ Failed to create billing portal session: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create billing portal session: {str(e)}"
        )

@app.get("/api/subscription/status")
async def get_subscription_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's subscription status"""
    # If subscriptions are disabled, return unlimited access
    if DISABLE_SUBSCRIPTION:
        return {
            "has_subscription": True,
            "plan_type": "unlimited",
            "status": "active",
            "subscription_disabled": True
        }
    
    # Normalize to timezone-aware UTC
    now_dt = datetime.now(timezone.utc)

    # Prefer an active subscription
    subscription = db.query(Subscription).filter(
        Subscription.user_id == current_user.id,
        Subscription.status == 'active'
    ).order_by(Subscription.start_date.desc()).first()

    # If no active, find a canceled subscription where end_date > now (evaluate in Python to avoid naive/aware DB issues)
    if not subscription:
        canceled_candidates = db.query(Subscription).filter(
            Subscription.user_id == current_user.id,
            Subscription.status == 'canceled',
            Subscription.end_date != None
        ).order_by(Subscription.end_date.desc()).all()

        for sub in canceled_candidates:
            sub_end = _to_utc_aware(sub.end_date)
            if sub_end and sub_end > now_dt:
                subscription = sub
                break

    # Fallback: most recent subscription by start_date
    if not subscription:
        subscription = db.query(Subscription).filter(
            Subscription.user_id == current_user.id
        ).order_by(Subscription.start_date.desc()).first()

    if not subscription:
        return {
            "has_subscription": False,
            "plan_type": None,
            "status": "none",
            "end_date": None
        }

    # Determine whether the reported subscription currently grants access
    sub_end_aware = _to_utc_aware(subscription.end_date)
    has_subscription = (subscription.status == 'active') or (
        subscription.status == 'canceled' and sub_end_aware and sub_end_aware > now_dt
    )

    return {
        "has_subscription": has_subscription,
        "plan_type": subscription.plan_type,
        "status": subscription.status,
        "start_date": subscription.start_date,
        "end_date": subscription.end_date
    }

@app.get("/api/subscription/plans")
async def get_subscription_plans():
    """Get available subscription plans with pricing"""
    try:
        monthly_price = get_stripe_service().get_price_info("monthly")
        yearly_price = get_stripe_service().get_price_info("yearly")
        
        return {
            "plans": [
                {
                    "id": "monthly",
                    "name": "Monthly Plan",
                    "price": monthly_price["amount"] / 100,  # Convert from cents
                    "currency": monthly_price["currency"],
                    "interval": "month",
                    "features": [
                        "Unlimited legal consultations",
                        "Access to Italian legal database",
                        "Multi-language support",
                        "Priority responses"
                    ]
                },
                {
                    "id": "yearly",
                    "name": "Yearly Plan",
                    "price": yearly_price["amount"] / 100,  # Convert from cents
                    "currency": yearly_price["currency"],
                    "interval": "year",
                    "features": [
                        "Unlimited legal consultations",
                        "Access to Italian legal database",
                        "Multi-language support",
                        "Priority responses",
                        "One-time yearly billing"
                    ]
                }
            ]
        }
    except Exception as e:
        # Return default plans if Stripe is not configured
        return {
            "plans": [
                {
                    "id": "monthly",
                    "name": "Monthly Plan",
                    "price": 1.89,
                    "currency": "usd",
                    "interval": "month",
                    "features": [
                        "Unlimited legal consultations",
                        "Access to Italian legal database",
                        "Multi-language support",
                        "Priority responses"
                    ]
                },
                {
                    "id": "yearly",
                    "name": "Yearly Plan",
                    "price": 9.79,
                    "currency": "usd",
                    "interval": "year",
                    "features": [
                        "Unlimited legal consultations",
                        "Access to Italian legal database",
                        "Multi-language support",
                        "Priority responses",
                        "One-time yearly billing"
                    ]
                }
            ]
        }

# =============================================================================
# STRIPE WEBHOOK
# =============================================================================

@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhooks - always requires signature verification"""
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    logger.debug("🔔 Stripe webhook received")

    try:
        # Always require signature verification - no environment exceptions
        event = get_stripe_service().construct_webhook_event(payload, sig_header)
        logger.debug("✅ Webhook signature verification completed")
        
        # Idempotency handling
        try:
            maybe_id = None
            if isinstance(event, dict):
                maybe_id = event.get("id")
            else:
                maybe_id = getattr(event, "id", None)
            if maybe_id:
                existing = db.query(ProcessedWebhookEvent).filter(ProcessedWebhookEvent.event_id == maybe_id).first()
                if existing:
                    logger.debug("↩️ Stripe event already processed, skipping")
                    return {"status": "skipped", "reason": "already processed"}
                processed = ProcessedWebhookEvent(event_id=maybe_id)
                db.add(processed)
                db.commit()
                logger.debug("🗄️ Recorded processed webhook event")
        except Exception as e:
            logger.warning("⚠️ Failed to persist idempotency for webhook")
            
    except ValueError as e:
        logger.warning(f"❌ Webhook verification failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

    # Handle the event with timeout protection
    try:
        await asyncio.wait_for(process_webhook_event(event, db), timeout=30.0)
    except asyncio.TimeoutError:
        logger.warning("⏰ Webhook processing timed out after 30 seconds")
        return {"status": "timeout", "message": "Webhook processing timed out"}
    except Exception:
        logger.error("❌ Error processing webhook")
        import traceback
        traceback.print_exc()
        
    return {"status": "success"}

async def process_webhook_event(event: Dict[str, Any], db: Session):
    """Process the webhook event - separated for timeout handling"""
    # Do not log event.type or ids; handlers can log non-sensitive status only.
    etype = None
    if isinstance(event, dict):
        etype = event.get("type")
    else:
        etype = getattr(event, "type", None)
    if etype == 'checkout.session.completed':
        session = event['data']['object']
        logger.debug("💳 Processing checkout.session.completed (ids suppressed)")
        await handle_checkout_session_completed(session, db)
        logger.debug("✅ Checkout session processed")
    
    elif etype == 'invoice.payment_succeeded':
        invoice = event['data']['object']
        logger.debug("💰 Processing invoice.payment_succeeded (ids suppressed)")
        await handle_invoice_payment_succeeded(invoice, db)
        logger.debug("✅ Invoice payment processed")
    
    elif etype == 'customer.subscription.deleted':
        subscription = event['data']['object']
        logger.debug("🗑️ Processing subscription.deleted (ids suppressed)")
        await handle_subscription_deleted(subscription, db)
        logger.debug("✅ Subscription deletion processed")
    
    elif etype == 'customer.subscription.updated':
        subscription = event['data']['object']
        logger.debug("🔄 Processing subscription.updated (ids suppressed)")
        await handle_subscription_updated(subscription, db)
        logger.debug("✅ Subscription update processed")
    
    else:
        logger.debug("ℹ️ Unhandled Stripe event type (suppressed)")

async def handle_checkout_session_completed(session: Dict[str, Any], db: Session):
    """Handle successful checkout session completion"""
    try:
        metadata = session.get('metadata', {})
        user_id = metadata.get('user_id')
        plan_type = metadata.get('plan_type')

        if not user_id:
            logger.debug("❌ No user_id in session metadata")
            return

        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            logger.debug("❌ No user found for provided user_id")
            return

        subscription_id = session.get('subscription')
        if not subscription_id:
            logger.debug("❌ No subscription ID in session")
            return

        logger.debug("📝 Checkout session processed (DB update deferred to invoice handler)")
    except Exception as e:
        logger.error("❌ Error in handle_checkout_session_completed")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise

async def handle_invoice_payment_succeeded(invoice: Dict[str, Any], db: Session):
    """Handle successful invoice payment"""
    # Resolve subscription_id from invoice 'subscription' or parent.subscription
    subscription_id = invoice.get("subscription") or invoice.get("parent", {}).get("subscription_details", {}).get("subscription")
    if not subscription_id:
        logger.debug("❌ No subscription ID in invoice")
        return

    # Always expand subscription when retrieving so metadata is available
    import stripe as stripe_sdk
    stripe_subscription = stripe_sdk.Subscription.retrieve(
        subscription_id,
        expand=["items", "latest_invoice", "default_payment_method"]
    )

    # Get plan_type from subscription metadata only
    plan_type = (stripe_subscription.get('metadata') or {}).get('plan_type')
    if not plan_type:
        logger.debug("❌ Subscription missing 'plan_type' in metadata")
        return

    # Resolve user: prefer created_by_user_id in subscription metadata, else try customer -> user lookup
    created_by_user_id = (stripe_subscription.get('metadata') or {}).get('created_by_user_id')
    from models import User, Subscription
    user = None
    if created_by_user_id:
        try:
            user = db.query(User).filter(User.id == int(created_by_user_id)).first()
            if user:
                logger.debug("Found user by created_by_user_id in subscription metadata")
        except Exception:
            user = None

    if not user:
        customer_id = stripe_subscription.get('customer') or invoice.get('customer')
        if not customer_id:
            logger.debug("❌ No customer id available in subscription")
            return
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if not user:
            logger.debug("❌ No local user found for Stripe customer")
            return

    # Get period timestamps from subscription top-level or first item
    start_ts = stripe_subscription.get('current_period_start')
    end_ts = stripe_subscription.get('current_period_end')
    if not start_ts or not end_ts:
        items = stripe_subscription.get('items', {})
        if items and 'data' in items and len(items['data']) > 0:
            first_item = items['data'][0]
            start_ts = first_item.get('current_period_start', start_ts)
            end_ts = first_item.get('current_period_end', end_ts)

    if not start_ts or not end_ts:
        logger.debug("❌ Subscription missing period fields")
        return

    # Check if subscription already exists
    existing_sub = db.query(Subscription).filter(Subscription.stripe_subscription_id == subscription_id).first()
    if existing_sub:
        logger.debug("⚠️ Subscription already exists, updating")
        existing_sub.status = 'active'
        existing_sub.end_date = datetime.fromtimestamp(end_ts)
        db.commit()
        logger.debug("✅ Subscription updated successfully")
        return

    # Create new subscription using plan_type from metadata only
    db_subscription = Subscription(
        user_id=user.id,
        stripe_subscription_id=subscription_id,
        plan_type=plan_type,
        status='active',
        start_date=datetime.fromtimestamp(int(start_ts), tz=timezone.utc),
        end_date=datetime.fromtimestamp(int(end_ts), tz=timezone.utc)
    )
    db.add(db_subscription)
    db.commit()
    logger.debug("✅ Subscription created successfully")

async def handle_subscription_deleted(subscription: Dict[str, Any], db: Session):
    """Handle subscription cancellation"""
    subscription_id = subscription.get('id')
    
    local_sub = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == subscription_id
    ).first()
    
    if local_sub:
        local_sub.status = "canceled"
        end_ts = subscription.get('cancel_at') or subscription.get('current_period_end')
        if end_ts:
            try:
                local_sub.end_date = datetime.fromtimestamp(int(end_ts), tz=timezone.utc)
            except Exception:
                pass
        db.commit()
        logger.debug("✅ Updated local subscription to canceled")
    else:
        try:
            customer = subscription.get('customer')
            plan_type = (subscription.get('metadata') or {}).get('plan_type')
            start_ts = subscription.get('current_period_start')
            end_ts = subscription.get('cancel_at') or subscription.get('current_period_end')

            user = None
            if customer:
                user = db.query(User).filter(User.stripe_customer_id == customer).first()

            if user:
                new_sub = Subscription(
                    user_id=user.id,
                    stripe_subscription_id=subscription_id,
                    plan_type=plan_type or None,
                    status='canceled',
                    start_date=datetime.fromtimestamp(start_ts) if start_ts else None,
                    end_date=datetime.fromtimestamp(end_ts) if end_ts else None
                )
                db.add(new_sub)
                db.commit()
                logger.debug("✅ Created local canceled subscription from webhook")
            else:
                logger.debug("⚠️ Subscription deleted webhook received but no local user found")
        except Exception:
            logger.debug("❌ Failed to create subscription from deleted webhook")

async def handle_subscription_updated(subscription: Dict[str, Any], db: Session):
    """Handle subscription updates"""
    subscription_id = subscription.get('id')

    db_subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == subscription_id
    ).first()
    
    if db_subscription:
        # Update subscription details
        cancel_at = subscription.get('cancel_at')
        cancel_at_period_end = subscription.get('cancel_at_period_end')
        current_period_end = subscription.get('current_period_end')

        # If Stripe scheduled a cancellation (cancel_at or cancel_at_period_end), treat it as canceled in the local DB
        if cancel_at or cancel_at_period_end:
            db_subscription.status = 'canceled'
        else:
            db_subscription.status = subscription.get('status')

        # Determine end_date: prefer explicit cancel_at (scheduled cancel), otherwise current_period_end
        end_ts = None
        if cancel_at:
            end_ts = cancel_at
        elif cancel_at_period_end and current_period_end:
            end_ts = current_period_end
        elif current_period_end:
            end_ts = current_period_end

        if end_ts:
            try:
                db_subscription.end_date = datetime.fromtimestamp(int(end_ts), tz=timezone.utc)
            except Exception:
                pass

        db.commit()
        logger.debug("✅ Updated local subscription from webhook")
    else:
        # No local subscription found - attempt to map to a user and create a record
        try:
            customer = subscription.get('customer')
            plan_type = (subscription.get('metadata') or {}).get('plan_type')
            start_ts = subscription.get('current_period_start')
            end_ts = None
            if subscription.get('cancel_at'):
                end_ts = subscription.get('cancel_at')
            elif subscription.get('cancel_at_period_end') and subscription.get('current_period_end'):
                end_ts = subscription.get('current_period_end')
            elif subscription.get('current_period_end'):
                end_ts = subscription.get('current_period_end')

            user = None
            if customer:
                user = db.query(User).filter(User.stripe_customer_id == customer).first()

            if user:
                # If subscription indicates scheduled cancellation, mark local status as 'canceled' so UI can show Access until {date}
                new_status = 'canceled' if (subscription.get('cancel_at') or subscription.get('cancel_at_period_end')) else subscription.get('status')
                new_sub = Subscription(
                    user_id=user.id,
                    stripe_subscription_id=subscription_id,
                    plan_type=plan_type or None,
                    status=new_status,
                    start_date=datetime.fromtimestamp(start_ts) if start_ts else None,
                    end_date=datetime.fromtimestamp(end_ts) if end_ts else None
                )
                db.add(new_sub)
                db.commit()
                logger.debug("✅ Created local subscription from updated webhook")
            else:
                logger.debug("⚠️ Subscription updated webhook received but no local user found")
        except Exception as e:
            logger.debug("❌ Failed to create subscription from updated webhook")

# =============================================================================
# CHAT ENDPOINTS (PROTECTED)
# =============================================================================

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Chat endpoint (enforces trial usage and subscription)"""
    if not chatbot:
        raise HTTPException(status_code=503, detail="Chatbot not initialized")
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Skip subscription checks if feature flag is disabled
    if not DISABLE_SUBSCRIPTION:
        # Get user's active subscription (if any)
        active_subscription = None
        now_dt = datetime.utcnow()
        for sub in current_user.subscriptions:
            # Treat subscription as active if status is 'active'
            # or if it was canceled but has an end_date in the future (scheduled cancellation)
            if sub.status == "active":
                active_subscription = sub
                break
            # normalize both datetimes to timezone-aware UTC before comparing
            now_dt_aware = _to_utc_aware(now_dt)
            sub_end_aware = _to_utc_aware(sub.end_date)
            if sub.status == "canceled" and sub_end_aware and sub_end_aware > now_dt_aware:
                active_subscription = sub
                break

        # Check if user has any subscription access (active or canceled with future end_date)
        has_subscription_access = active_subscription is not None

        # Enforce trial limit: 20 questions if not subscribed AND no valid canceled subscription
        if (current_user.questions_used is not None and current_user.questions_used >= 20) and not has_subscription_access:
            raise HTTPException(status_code=403, detail={"error": "Trial limit reached. Please subscribe to continue."})

    try:
        language = (request.language or "english").lower()
        if language == "italian":
            collection = "law_chunks_italian_language"
        else:
            collection = "law_chunks"

        # Use conversation_id to manage chat history
        conversation_id = request.conversation_id or str(uuid.uuid4())
        if conversation_id not in chat_histories:
            chat_histories[conversation_id] = []

        # Set chatbot's chat history for this conversation
        chatbot.chat_history = chat_histories[conversation_id]

        # Get response
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            chatbot.get_response,
            request.message,
            collection,
            language
        )

        # Save updated history back to the dict
        chat_histories[conversation_id] = chatbot.chat_history

        # Save chat history to database
        chat_record = ChatHistory(
            user_id=current_user.id,
            conversation_id=conversation_id,
            message=request.message,
            response=response,
            language=language,
            country=request.country or "italy"
        )
        db.add(chat_record)

        # Increment questions_used only if subscription feature is enabled and user doesn't have access
        if not DISABLE_SUBSCRIPTION and not has_subscription_access:
            current_user.questions_used = (current_user.questions_used or 0) + 1
            db.add(current_user)

        db.commit()

        return ChatResponse(
            response=response,
            conversation_id=conversation_id
        )
    except Exception as e:
        print(f"❌ Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Add new endpoint to get feature flags
@app.get("/api/feature-flags")
async def get_feature_flags():
    """Get feature flags"""
    return {
        "subscription_disabled": DISABLE_SUBSCRIPTION
    }

# =============================================================================
# PUBLIC ENDPOINTS
# =============================================================================

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if chatbot is not None else "unhealthy",
        message="Legal RAG Chatbot API with Stripe is running" if chatbot is not None else "Chatbot not initialized"
    )

@app.get("/api/system-info")
async def get_system_info():
    """Get system information endpoint (public for demo)"""
    if not chatbot:
        raise HTTPException(status_code=503, detail="Chatbot not initialized")
    
    try:
        # Just get the model name safely
        model_name = getattr(chatbot, 'llm_model_name', 'llama-3.3-70b-versatile')
        embedding_model = getattr(chatbot, 'embedding_model_name', 'intfloat/multilingual-e5-base')
        
        return {
            "model": model_name,
            "embedding_model": embedding_model,
            "knowledge_base": "Italian Legal Documents",
            "status": "Online",
            "subscription_required": True
        }
    except Exception as e:
        # Fallback with correct model name
        return {
            "model": "llama-3.3-70b-versatile",
            "embedding_model": "intfloat/multilingual-e5-base", 
            "knowledge_base": "Italian Legal Documents",
            "status": "Online",
            "subscription_required": True,
            "error": str(e)
        }

@app.post("/api/clear-history")
async def clear_history_endpoint(
    request: ClearHistoryRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Clear the chatbot's conversation history"""
    if not chatbot:
        raise HTTPException(status_code=503, detail="Chatbot not initialized")
    
    # Generate a new conversation ID
    new_convo_id = str(uuid.uuid4())
    chat_histories[new_convo_id] = []
    chatbot.clear_history()
    return {"status": "cleared", "conversation_id": new_convo_id}

@app.get("/api/chat/history")
async def get_chat_history(
    language: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's chat history from database"""
    try:
        # Get chat history from database, optionally filtered by language
        query = db.query(ChatHistory).filter(ChatHistory.user_id == current_user.id)
        if language:
            query = query.filter(ChatHistory.language == language.lower())

        # Return oldest records first so messages per record remain user->bot in chronological order
        chat_records = query.order_by(ChatHistory.created_at.asc()).limit(100).all()

        # Group by conversation_id
        conversations = {}
        for record in chat_records:
            conv_id = record.conversation_id
            if conv_id not in conversations:
                conversations[conv_id] = {
                    "id": conv_id,
                    "title": record.message[:50] + "..." if len(record.message) > 50 else record.message,
                    "lastMessage": record.response[:50] + "..." if len(record.response) > 50 else record.response,
                    "timestamp": record.created_at.isoformat(),
                    "messages": []
                }

            # Add user message
            conversations[conv_id]["messages"].append({
                "id": f"{record.id}-user",
                "content": record.message,
                "isUser": True,
                "timestamp": record.created_at.strftime("%H:%M")
            })

            # Add bot response
            conversations[conv_id]["messages"].append({
                "id": f"{record.id}-bot", 
                "content": record.response,
                "isUser": False,
                "timestamp": record.created_at.strftime("%H:%M")
            })

        return list(conversations.values())
    except Exception as e:
        print(f"Error loading chat history: {e}")
        return []

@app.post("/api/chat/save-history")
async def save_chat_history(
    request: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Save chat history to database (auto-saved during chat)"""
    # This endpoint can be used for bulk saves if needed
    # Individual messages are already saved in the chat endpoint
    return {"status": "saved"}

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Legal RAG Chatbot API with Stripe Subscriptions",
        "version": "2.0.0",
        "endpoints": {
            "health": "/api/health",
            "register": "/api/auth/register",
            "login": "/api/auth/login",
            "subscription_plans": "/api/subscription/plans",
            "chat": "/api/chat (requires subscription)",
            "docs": "/docs"
        }
    }

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=404,
        content={
            "error": "Endpoint not found",
            "message": "Please check the API documentation at /docs"
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "Something went wrong on our end"
        }
    )

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Legal RAG Chatbot API Server with Stripe integration...")
    port = int(os.environ.get("PORT", 8000))
    print(f"📡 Starting server on port {port}")
    
    is_production = os.environ.get("ENVIRONMENT") == "production"
    
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=port,
        reload=not is_production,
        reload_dirs=["./"] if not is_production else None,
        log_level="info"
    )
