import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

export const SubscriptionSuccess: React.FC = () => {
  const { refreshSubscription, subscription } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [step, setStep] = useState<'processing' | 'success' | 'error'>('processing');
  const [redirectCount, setRedirectCount] = useState(5);

  useEffect(() => {
    // Get session ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const session = urlParams.get('session_id');
    setSessionId(session);

    // Process the successful payment
    const processPayment = async () => {
      try {
        setStep('processing');
        
        // Wait longer for Stripe webhook to process
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Try multiple times to refresh subscription status
        let attempts = 0;
        let subscriptionActive = false;
        
        while (attempts < 5 && !subscriptionActive) {
          await refreshSubscription();
          
          // Directly fetch subscription status to get fresh data
          try {
            const freshSubscriptionData = await apiClient.getSubscriptionStatus();
            console.log('Checking subscription status, attempt:', attempts + 1, freshSubscriptionData);
            if (freshSubscriptionData?.has_subscription) {
              subscriptionActive = true;
              break;
            }
          } catch (error) {
            console.error('Error fetching subscription status:', error);
          }
          
          attempts++;
          if (attempts < 5) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        
        setStep('success');
        setIsLoading(false);
        
        // Start countdown to redirect to chatbot
        let count = 5;
        const countdown = setInterval(() => {
          count--;
          setRedirectCount(count);
          
          if (count <= 0) {
            clearInterval(countdown);
            // Force a full page reload to ensure subscription status is fresh
            window.location.href = '/?verified=true';
          }
        }, 1000);
        
        return () => clearInterval(countdown);
        
      } catch (error) {
        console.error('Error processing payment:', error);
        setStep('error');
        setIsLoading(false);
      }
    };

    processPayment();
  }, [refreshSubscription]);

  if (isLoading || step === 'processing') {
    return (
      <div className="max-w-md mx-auto mt-16 p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
            </div>
            <CardTitle className="text-2xl font-bold text-blue-600">
              Processing Payment...
            </CardTitle>
            <CardDescription>
              Please wait while we activate your subscription
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              This may take a few moments. Please don't close this page.
            </p>
            {sessionId && (
              <p className="text-xs text-muted-foreground mt-2">
                Session: {sessionId.substring(0, 20)}...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="max-w-md mx-auto mt-16 p-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-red-600">
              Payment Processing Error
            </CardTitle>
            <CardDescription>
              There was an issue activating your subscription
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Your payment was successful, but we had trouble activating your subscription. 
              Please contact support or try refreshing the page.
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Retry Activation
              </Button>
              <Button 
                onClick={() => window.location.href = '/dashboard'}
                variant="outline"
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">
            Payment Successful! 🎉
          </CardTitle>
          <CardDescription>
            Welcome to Legal AI Assistant Premium
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Your subscription has been activated successfully. You now have unlimited access to our AI legal assistant.
          </p>
          
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">
              Redirecting to chatbot in {redirectCount} seconds...
            </p>
            <p className="text-xs text-green-600 mt-1">
              You can start asking legal questions immediately!
            </p>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={() => window.location.href = '/'}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Start Using Legal Assistant Now →
            </Button>
            <Button 
              onClick={() => window.location.href = '/dashboard'}
              variant="outline"
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </div>
          
          {subscription?.has_subscription && (
            <div className="text-xs text-muted-foreground">
              ✅ Subscription Status: Active ({subscription.plan_type})
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export const SubscriptionCancel: React.FC = () => {
  return (
    <div className="max-w-md mx-auto mt-16 p-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-red-600">
            Payment Cancelled
          </CardTitle>
          <CardDescription>
            Your subscription was not activated
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            No charges were made to your account. You can try again or contact support if you need assistance.
          </p>
          <div className="space-y-2">
            <Button 
              onClick={() => window.location.href = '/subscription'}
              className="w-full"
            >
              Try Again
            </Button>
            <Button 
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="w-full"
            >
              Return Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
