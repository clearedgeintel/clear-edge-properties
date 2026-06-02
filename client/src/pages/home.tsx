import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "@/components/property-card";
import { AuthModal } from "@/components/auth-modal";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Target, FileText, TrendingUp } from "lucide-react";

export default function Home() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isAuthenticated, hasActiveSubscription } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/dashboard');
    }
  }, [isAuthenticated, setLocation]);

  const { data: previewProperties, isLoading } = useQuery<any[]>({
    queryKey: ['/api/properties'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleGetStarted = () => {
    if (isAuthenticated && hasActiveSubscription) {
      setLocation('/dashboard');
    } else if (isAuthenticated) {
      setLocation('/subscribe');
    } else {
      setShowAuthModal(true);
    }
  };

  const handleLearnMore = () => {
    document.getElementById('methodology')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative min-h-screen bg-gradient-to-br from-brand-blue via-brand-blue to-brand-navy text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(circle_at_30%_20%,white,transparent_60%)]"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 flex items-center min-h-screen">
          <div className="grid lg:grid-cols-2 gap-12 items-center w-full">
            {/* Content */}
            <div>
              <h1 className="font-heading text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Find your edge in
                <span className="block text-brand-orange">every property.</span>
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
                ClearEdge Props helps you compare listings, spot opportunity, and make smarter real estate decisions with clean property intelligence.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  variant="cta"
                  onClick={handleGetStarted}
                  className="px-8 py-4 text-lg h-auto font-semibold"
                >
                  Start Exploring Properties
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLearnMore}
                  className="border-2 border-white text-white bg-transparent hover:bg-white hover:text-brand-blue px-8 py-4 text-lg h-auto"
                >
                  See How It Works
                </Button>
              </div>
            </div>
            
            {/* Property Stats */}
            <div className="lg:ml-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <h3 className="text-2xl font-bold mb-6 text-center">Live Property Data</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-brand-orange">5,000+</div>
                    <div className="text-sm text-blue-100">Properties Analyzed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-brand-orange">94%</div>
                    <div className="text-sm text-blue-100">Accuracy Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-brand-orange">$2.1M</div>
                    <div className="text-sm text-blue-100">Avg Deal Value</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-brand-orange">15%</div>
                    <div className="text-sm text-blue-100">Avg ROI Increase</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scoring Methodology */}
      <section id="methodology" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              Stop guessing. Start comparing.
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Most platforms show you listings. ClearEdge Props helps you understand them — turning property data into a cleaner decision view.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-xl bg-brand-light border border-slate-200">
              <div className="w-16 h-16 bg-brand-blue rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="text-white h-8 w-8" />
              </div>
              <h3 className="font-heading text-xl font-semibold text-slate-800 mb-2">Clear property snapshots</h3>
              <p className="text-slate-600">
                Turn listing details, price signals, and location context into a simple summary that's easy to act on.
              </p>
            </div>

            <div className="text-center p-6 rounded-xl bg-brand-light border border-slate-200">
              <div className="w-16 h-16 bg-brand-orange rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="text-white h-8 w-8" />
              </div>
              <h3 className="font-heading text-xl font-semibold text-slate-800 mb-2">Comparable scoring</h3>
              <p className="text-slate-600">
                Use repeatable criteria so every property is measured with the same lens.
              </p>
            </div>

            <div className="text-center p-6 rounded-xl bg-brand-light border border-slate-200">
              <div className="w-16 h-16 bg-brand-navy rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="text-white h-8 w-8" />
              </div>
              <h3 className="font-heading text-xl font-semibold text-slate-800 mb-2">Faster decisions</h3>
              <p className="text-slate-600">
                Cut down research time and focus only on opportunities worth a deeper review.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Deals Teaser */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Top Live Deals</h2>
            <p className="text-lg text-slate-600">Get a preview of our high-scoring investment opportunities</p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="w-full h-48 bg-slate-200 animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 bg-slate-200 rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
              {previewProperties?.map((property: any) => (
                <PropertyCard
                  key={property.zpid}
                  property={property}
                  isBlurred={!hasActiveSubscription}
                />
              ))}
            </div>
          )}

          <div className="text-center">
            <Button
              variant="cta"
              onClick={handleGetStarted}
              className="px-8 py-3 text-lg h-auto font-semibold"
            >
              Unlock all deals — Start exploring
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-heading text-lg font-semibold mb-2">ClearEdge Props</h3>
              <p className="text-brand-orange text-sm font-medium mb-3">Find your edge in every property.</p>
              <p className="text-slate-300 text-sm">
                Where property search becomes property intelligence — compare opportunities with confidence.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-300">
                <li><a href="#methodology" className="hover:text-white transition-colors">How It Works</a></li>
                <li><Link href="/subscribe" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">API Access</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-slate-300">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-300">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 mt-8 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2026 ClearEdge Props. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </div>
  );
}
