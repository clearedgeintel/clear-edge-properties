import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "@/components/property-card";
import { AuthModal } from "@/components/auth-modal";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { ChartLine, Calculator, Building, Brain, Target, FileText, TrendingUp } from "lucide-react";

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
      <section className="relative min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop')`
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 via-blue-800/80 to-blue-700/70"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 flex items-center min-h-screen">
          <div className="grid lg:grid-cols-2 gap-12 items-center w-full">
            {/* Content */}
            <div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Find Your Next
                <span className="block text-yellow-400">Investment Property</span>
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
                The complete real estate investor CRM platform with AI-powered property scoring, deal tracking, and intelligent commentary to maximize your investment returns.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={handleGetStarted}
                  className="bg-yellow-400 text-blue-900 hover:bg-yellow-300 px-8 py-4 text-lg h-auto font-semibold"
                >
                  Start Free Trial
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleLearnMore}
                  className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 text-lg h-auto"
                >
                  Learn More
                </Button>
              </div>
            </div>
            
            {/* Property Stats */}
            <div className="lg:ml-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <h3 className="text-2xl font-bold mb-6 text-center">Live Property Data</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-400">5,000+</div>
                    <div className="text-sm text-blue-100">Properties Analyzed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-400">94%</div>
                    <div className="text-sm text-blue-100">Accuracy Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-400">$2.1M</div>
                    <div className="text-sm text-blue-100">Avg Deal Value</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-400">15%</div>
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
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              Our Scoring Methodology
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              We analyze dozens of data points to provide you with a comprehensive investment score
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <ChartLine className="text-white h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Market Analysis</h3>
              <p className="text-slate-600">
                Comparable sales, price trends, and market velocity in the area
              </p>
            </div>
            
            <div className="text-center p-6 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calculator className="text-white h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Cash Flow Potential</h3>
              <p className="text-slate-600">
                Rental income estimates, operating expenses, and ROI calculations
              </p>
            </div>
            
            <div className="text-center p-6 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building className="text-white h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Property Quality</h3>
              <p className="text-slate-600">
                Condition, location desirability, and growth potential assessment
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
              onClick={handleGetStarted}
              className="px-8 py-3 text-lg h-auto"
            >
              Unlock All Deals - Start Free Trial
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">ClearEdge Deals</h3>
              <p className="text-slate-300 text-sm">
                Complete real estate investor CRM platform with AI-powered deal analysis.
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
            <p>&copy; 2025 ClearEdge Deals. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </div>
  );
}
