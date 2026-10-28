import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star } from "lucide-react";
import { Link } from "wouter";
import { EmptyState, ErrorState } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { data: packages, isLoading, isError, refetch } = useQuery<SubscriptionPackage[]>({
    queryKey: ["/api/subscription-packages"],
  });

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
    <div className="min-h-screen bg-gradient-to-b from-brand-light/60 to-slate-50 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-orange">Pricing</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-brand-navy">
            Choose your plan
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Scored listings, map exploration, AI underwriting and a deal pipeline — sized to how you invest.
          </p>
        </div>

        {isError ? (
          <ErrorState className="mx-auto max-w-lg" onRetry={() => refetch()} description="We couldn't load plans. Try again in a moment." />
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[480px] rounded-xl" />
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-start">
          {packages?.map((pkg) => {
            const packageData = formatPackageData(pkg.features);
            const popular = isPopular(pkg.tier);

            return (
              <Card
                key={pkg.id}
                className={`relative bg-white transition-all duration-300 hover:shadow-xl ${
                  popular
                    ? "border-2 border-brand-blue shadow-lg shadow-brand-blue/10 lg:-mt-4"
                    : "border-border shadow-sm hover:border-brand-blue/30"
                }`}
              >
                {popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-brand-orange hover:bg-brand-orange text-white px-4 py-1 rounded-full border-0 shadow-sm">
                      <Star className="w-4 h-4 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold text-brand-navy">
                    {pkg.name}
                  </CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-extrabold text-brand-navy">
                      ${pkg.price}
                    </span>
                    <span className="text-slate-500">
                      /{pkg.billingInterval}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-brand-navy mb-3">Features</h4>
                    <ul className="space-y-2">
                      {packageData.featureList.map((feature: string, index: number) => (
                        <li key={index} className="flex items-center text-sm text-slate-600">
                          <Check className="w-4 h-4 text-score-high mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-brand-navy mb-3">Usage Limits</h4>
                    <div className="space-y-2 text-sm text-slate-600">
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
                    asChild={pkg.tier !== "free"}
                    variant={popular ? "cta" : "default"}
                    className="w-full py-3"
                    disabled={pkg.tier === "free"}
                  >
                    {pkg.tier === "free" ? (
                      "Included free"
                    ) : (
                      <Link href="/subscribe">Get started</Link>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        )}

        {!isLoading && !isError && packages?.length === 0 && (
          <EmptyState className="mx-auto max-w-lg" title="Plans coming soon" description="Pricing isn't published yet. Check back shortly." />
        )}

        <p className="text-center mt-12 text-sm text-slate-500">
          Payments are processed securely by Stripe. Change or cancel your plan anytime from your profile.
        </p>
      </div>
    </div>
  );
}