import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '../contexts/AuthContext';
import { apiClient, SubscriptionPlan } from '../lib/api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Check, Crown, Loader2, Star, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { detectUserCurrency, formatPrice } from '../lib/currency';

// Initialize Stripe
// Prefer the VITE-prefixed publishable key (only VITE_ vars are exposed to the browser).
const VITE_PUBLISHABLE = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const FALLBACK_PUBLISHABLE = import.meta.env.STRIPE_PUBLISHABLE_KEY as string | undefined;
const STRIPE_PUBLISHABLE_KEY = VITE_PUBLISHABLE ?? FALLBACK_PUBLISHABLE;

if (!STRIPE_PUBLISHABLE_KEY) {
  // Missing publishable key is a hard failure for checkout; don't call loadStripe with an empty string.
  console.error('Missing VITE_STRIPE_PUBLISHABLE_KEY in frontend environment. Set VITE_STRIPE_PUBLISHABLE_KEY in your .env and restart the dev server.');
}

// Remove console.log for security - publishable keys should not be logged even partially
// console.log('Using Stripe publishable key (first 12 chars):', STRIPE_PUBLISHABLE_KEY ? STRIPE_PUBLISHABLE_KEY.slice(0,12) + '...' : 'MISSING');

// Only initialize Stripe if we have a non-empty publishable key. Otherwise stripePromise resolves to null.
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : Promise.resolve(null as any);

export const SubscriptionPlans: React.FC = () => {
  const { user, subscription, refreshSubscription } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [userCurrency, setUserCurrency] = useState<'usd' | 'eur'>('usd');

  useEffect(() => {
    const initializePlans = async () => {
      try {
        // If user has an existing subscription, use that currency
        let currency: 'usd' | 'eur' = 'usd';
        
        if (subscription?.plan_type) {
          // Extract currency from plan_type (e.g., "monthly_usd" -> "usd")
          const parts = subscription.plan_type.split('_');
          if (parts.length === 2 && (parts[1] === 'usd' || parts[1] === 'eur')) {
            currency = parts[1] as 'usd' | 'eur';
            console.log('Using existing subscription currency:', currency);
          } else {
            // Legacy plan_type without currency, detect from IP
            currency = await detectUserCurrency();
            console.log('Detected currency from IP:', currency);
          }
        } else {
          // No subscription, detect from IP geolocation
          currency = await detectUserCurrency();
          console.log('Detected currency from IP:', currency);
        }
        
        setUserCurrency(currency);
        
        // Fetch plans with detected currency
        await fetchPlans(currency);
      } catch (error) {
        console.error('Error initializing plans:', error);
        setError('Failed to initialize subscription plans');
        setLoading(false);
      }
    };
    
    // Refresh subscription status on mount so UI reflects any recent webhook updates
    (async () => {
      try {
        await refreshSubscription();
      } catch (e) {
        // ignore
      }
    })();
    
    // If publishable key is missing, surface a helpful error to the UI
    if (!STRIPE_PUBLISHABLE_KEY) {
      setError('Stripe publishable key not found in frontend environment. Set VITE_STRIPE_PUBLISHABLE_KEY in .env and restart the dev server.');
    }
    
    initializePlans();
  }, [subscription?.plan_type]);

  const fetchPlans = async (currency: string) => {
    try {
      const response = await apiClient.getSubscriptionPlans(currency);
      setPlans(response.plans);
    } catch (error) {
      setError('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!user) return;

    setProcessingPlan(planId);
    setError('');

    try {
      // Create checkout session
      const response = await apiClient.createCheckoutSession(planId);
      console.log('Checkout session response:', response);
      
      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      
      // Try stripe.redirectToCheckout first if we have session_id and Stripe.js loaded
      if (stripe && response?.session_id) {
        console.log('Attempting Stripe.js redirect with session_id:', response.session_id);
        const { error } = await stripe.redirectToCheckout({
          sessionId: response.session_id,
        });

        if (error) {
          console.error('Stripe redirect error:', error);
          // If redirectToCheckout failed, fall back to the hosted session URL if available
          if (response?.session_url) {
            console.log('Falling back to session_url:', response.session_url);
            window.open(response.session_url, '_blank');
          }
          setError(`Stripe redirect failed: ${error.message}. Opened checkout in new tab.`);
        }
      } else if (response?.session_url) {
        // Stripe.js wasn't available or session_id is missing - open hosted checkout URL directly
        console.log('Opening session_url directly:', response.session_url);
        window.open(response.session_url, '_blank');
        setError('Opened checkout in new tab (Stripe.js unavailable)');
      } else {
        console.error('No checkout URL in response:', response);
        setError('Failed to start checkout (no checkout URL returned)');
      }
    } catch (error: any) {
      console.error('Checkout session creation error:', error);
      // Try to open a session_url returned in the error payload if present
      const sessionUrl = error?.response?.data?.session_url || error?.session_url;
      if (sessionUrl) {
        console.log('Opening session_url from error payload:', sessionUrl);
        window.open(sessionUrl, '_blank');
        setError('Checkout session creation failed, but opened payment link in new tab');
      } else {
        setError(error?.message || 'Failed to start checkout process');
      }
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await apiClient.createBillingPortalSession();
      window.open(response.portal_url, '_blank');
    } catch (error) {
      setError('Failed to open billing portal');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
          <div className="mb-4">
            <Button variant="ghost" size="sm" onClick={() => (window.location.replace('/')) }>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Chat
            </Button>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Choose Your Plan</h1>
            <p className="text-lg text-muted-foreground">
              Get unlimited access to our AI legal assistant with premium features
            </p>
          </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Current Subscription Status */}
      {subscription?.has_subscription && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {subscription.plan_type === 'monthly' ? 'Monthly Plan' : 'Yearly Plan'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Status: <Badge variant="secondary">{subscription.status}</Badge>
                </p>
                {subscription.end_date && (
                  <p className="text-sm text-muted-foreground">
                    {subscription.status === 'canceled' ? (
                      <>
                        You have cancelled your subscription. Access until: {new Date(subscription.end_date).toLocaleDateString()}
                      </>
                    ) : (
                      <>Next billing: {new Date(subscription.end_date).toLocaleDateString()}</>
                    )}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleManageBilling} variant="outline" size="sm">
                  Manage Billing
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Plans */}
      <div className="grid md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const now = new Date();
          const subscriptionEndDate = subscription?.end_date ? new Date(subscription.end_date) : null;
          // subscription is considered "valid" (still providing access) when the user has a subscription
          // and either no end_date is set (recurring) or the end_date is in the future.
          const subscriptionValid = !!(subscription && subscription.has_subscription && (!subscriptionEndDate || subscriptionEndDate > now));
          const isCurrentPlan = subscription?.plan_type === plan.id && subscriptionValid;
          const isYearly = plan.id === 'yearly' || plan.id === 'yearly_usd' || plan.id === 'yearly_eur';
          
          return (
            <Card 
              key={plan.id} 
              className={`relative ${isYearly ? 'border-primary shadow-lg scale-105' : ''}`}
            >
              {isYearly && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {isCurrentPlan && (
                    <Badge variant="secondary">Current</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold">
                    {formatPrice(plan.price, plan.currency)}
                  </span>
                  <span className="text-muted-foreground">
                    /{plan.interval}
                  </span>
                </CardDescription>
                {isYearly && (
                  <p className="text-sm text-green-600 font-medium">
                    Save 57% compared to monthly
                  </p>
                )}
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={
                    processingPlan === plan.id ||
                    !user ||
                    // If there's a valid subscription (including canceled-but-still-active),
                    // lock subscribe buttons so users can't switch plans mid-subscription.
                    subscriptionValid
                  }
                  className="w-full"
                  variant={isYearly ? 'default' : 'outline'}
                >
                  {processingPlan === plan.id && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isCurrentPlan 
                    ? 'Current Plan' 
                    : `Subscribe to ${plan.name}`
                  }
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Feature Comparison */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-center mb-6">Why Choose Premium?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Unlimited Consultations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ask as many legal questions as you need without any daily limits
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Italian Legal Database</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Access to comprehensive Italian legal documents and case law
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Priority Support 24/7</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Receive faster responses and prioritized processing of your queries
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
