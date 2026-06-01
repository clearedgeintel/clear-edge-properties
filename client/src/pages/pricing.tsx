import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star } from "lucide-react";

// Local shape: subscription packages are no longer part of @shared/schema.
type SubscriptionPackage = {
  id: string;
  name: string;
  tier: string;
  price: string | number;
  billingInterval: string;
  features: unknown;
};

export default function Pricing() {
  const { data: packages, isLoading } = useQuery<SubscriptionPackage[]>({
    queryKey: ["/api/subscription-packages"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const formatPackageData = (features: unknown) => {
    if (typeof features === 'object' && features !== null) {
      const featuresObj = features as any;
      return {
        featureList: Array.isArray(featuresObj.featureList) ? featuresObj.featureList : [],
        limits: featuresObj.limits || {
          propertyViews: 0,
          watchlistItems: 0,
          aiAnalysis: 0,
          pdfExports: 0
        }
      };
    }
    return {
      featureList: [],
      limits: {
        propertyViews: 0,
        watchlistItems: 0,
        aiAnalysis: 0,
        pdfExports: 0
      }
    };
  };

  const formatLimit = (value: number): string => {
    return value === -1 ? "Unlimited" : value.toString();
  };

  const isPopular = (tier: string) => tier === "pro";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Unlock powerful real estate investment tools and insights to accelerate your portfolio growth
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {packages?.map((pkg) => {
            const packageData = formatPackageData(pkg.features);
            const popular = isPopular(pkg.tier);

            return (
              <Card 
                key={pkg.id} 
                className={`relative transition-all duration-300 hover:shadow-xl ${
                  popular 
                    ? "border-blue-500 shadow-lg scale-105" 
                    : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                }`}
              >
                {popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white px-4 py-1 rounded-full">
                      <Star className="w-4 h-4 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                    {pkg.name}
                  </CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                      ${pkg.price}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      /{pkg.billingInterval}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Features</h4>
                    <ul className="space-y-2">
                      {packageData.featureList.map((feature: string, index: number) => (
                        <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                          <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Usage Limits</h4>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex justify-between">
                        <span>Property Views:</span>
                        <span className="font-medium">{formatLimit(packageData.limits.propertyViews)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Watchlist Items:</span>
                        <span className="font-medium">{formatLimit(packageData.limits.watchlistItems)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>AI Analysis:</span>
                        <span className="font-medium">{formatLimit(packageData.limits.aiAnalysis)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>PDF Exports:</span>
                        <span className="font-medium">{formatLimit(packageData.limits.pdfExports)}</span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    className={`w-full py-3 ${
                      popular 
                        ? "bg-blue-600 hover:bg-blue-700 text-white" 
                        : "bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                    }`}
                    disabled={pkg.tier === "free"}
                  >
                    {pkg.tier === "free" ? "Current Plan" : "Get Started"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            All plans include 7-day free trial • Cancel anytime • No setup fees
          </p>
          <div className="flex justify-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
            <span>✓ Bank-level security</span>
            <span>✓ 24/7 support</span>
            <span>✓ Regular updates</span>
          </div>
        </div>
      </div>
    </div>
  );
}