import { useState, useEffect } from "react";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Check } from "lucide-react";

const isDevelopment = import.meta.env.DEV;
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || (isDevelopment ? 'pk_test_dummy_development_key' : '');

if (!stripePublicKey) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}

// Only load Stripe if we have a real key
const stripePromise = stripePublicKey.startsWith('pk_') ? loadStripe(stripePublicKey) : Promise.resolve(null);

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/browse',
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Welcome to PropertyScore Pro!",
      });
    }
    
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || loading}
      >
        {loading ? "Processing..." : "Subscribe Now"}
      </Button>
    </form>
  );
};

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const { user, isAuthenticated, hasActiveSubscription, session } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthenticated || !session) return;

    if (hasActiveSubscription) {
      toast({
        title: "Already Subscribed",
        description: "You already have an active subscription.",
      });
      return;
    }

    // Create subscription
    apiRequest("POST", "/api/create-subscription", {})
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'active') {
          toast({
            title: "Already Active",
            description: "Your subscription is already active!",
          });
          window.location.href = '/browse';
        } else {
          setClientSecret(data.clientSecret);
        }
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: "Failed to setup subscription: " + error.message,
          variant: "destructive",
        });
      });
  }, [isAuthenticated, session, hasActiveSubscription]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to start your subscription.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasActiveSubscription) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-green-600">Already Subscribed</CardTitle>
            <CardDescription>
              You have an active subscription to PropertyScore Pro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/browse'}
              className="w-full"
            >
              Browse Properties
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-800 mb-4">
            Start Your Free Trial
          </h1>
          <p className="text-xl text-slate-600">
            Get unlimited access to scored real estate listings
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Pricing Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">PropertyScore Pro</CardTitle>
              <CardDescription>
                Full access to our real estate investment platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-slate-800">$99</div>
                <div className="text-slate-600">per month</div>
              </div>
              
              <ul className="space-y-3">
                {[
                  "Unlimited property browsing",
                  "Detailed scoring breakdown",
                  "Advanced search and filters",
                  "Watchlist functionality", 
                  "ROI calculations",
                  "Market analysis data",
                  "Email alerts for new listings",
                  "Priority customer support"
                ].map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="font-semibold text-blue-800 mb-1">
                  7-Day Free Trial
                </div>
                <div className="text-sm text-blue-700">
                  Try all features free for 7 days. Cancel anytime.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
              <CardDescription>
                Enter your payment details to start your free trial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Elements 
                stripe={stripePromise} 
                options={{ 
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                  },
                }}
              >
                <SubscribeForm />
              </Elements>
              
              <div className="mt-6 text-sm text-slate-600 space-y-2">
                <p>• No charges during your 7-day free trial</p>
                <p>• Cancel anytime from your account settings</p>
                <p>• Secure payment processing by Stripe</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
