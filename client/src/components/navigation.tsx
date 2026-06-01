import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { User as DbUser, Tenant } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  Home,
  Search,
  BarChart3,
  GitCompare,
  Calculator,
  Settings,
  DollarSign,
  HelpCircle,
  Palette,
  Shield,
  Activity,
  Code,
  FileText,
  Building2,
  Database,
  Table,
  MapPin,
  Calendar,
  Eye,
  RefreshCw,
  Archive,
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  Sparkles,
  Users,
  Wallet,
  Bell
} from "lucide-react";
import { AuthModal } from "./auth-modal";

export function Navigation() {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Get user authentication status
  const { data: authData } = useQuery<{ user: DbUser; tenant: Tenant }>({
    queryKey: ['/api/auth/user'],
  });

  const user = authData?.user;
  const tenant = authData?.tenant;
  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';
  const hasActiveSubscription = tenant?.subscriptionStatus === 'active';

  const handleSignOut = async () => {
    try {
      await apiRequest('POST', '/api/auth/signout');
      window.location.reload();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Grouped navigation. Core workflow stays top-level; occasional analysis tools
  // and rarely-touched account/dev pages are tucked into labeled sections so the
  // sidebar stops being an 18-item flat wall. White-label is demoted into Account
  // and gated behind an active subscription (the product targets individual
  // investors, for whom branding is not a primary feature).
  type NavItem = { href: string; label: string; icon: typeof Home; show: boolean };
  const navSections: { title?: string; items: NavItem[] }[] = [
    {
      items: [
        { href: "/", label: "Home", icon: Home, show: !isAuthenticated },
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: isAuthenticated },
        { href: "/browse", label: "Browse Properties", icon: Search, show: true },
        { href: "/property-search", label: "Property Search", icon: Building2, show: isAuthenticated },
        { href: "/saved-searches", label: "Saved Searches", icon: Bell, show: isAuthenticated },
        { href: "/deals", label: "My Deals", icon: BarChart3, show: isAuthenticated },
        { href: "/buyers", label: "Cash Buyers", icon: Wallet, show: isAuthenticated },
        { href: "/portfolio", label: "Portfolio", icon: Briefcase, show: isAuthenticated },
        { href: "/market-trends", label: "Market Trends", icon: TrendingUp, show: isAuthenticated },
      ],
    },
    {
      title: "Tools",
      items: [
        { href: "/property-details", label: "Financial Analysis", icon: Table, show: isAuthenticated },
        { href: "/agent-lookup", label: "Agent Lookup", icon: Users, show: isAuthenticated },
        { href: "/deal-comparison", label: "Compare Deals", icon: GitCompare, show: isAuthenticated },
        { href: "/equity-toolkit", label: "Investment Toolkit", icon: Calculator, show: isAuthenticated },
        { href: "/recommendations", label: "Recommendations", icon: Sparkles, show: isAuthenticated },
      ],
    },
    {
      title: "Account",
      items: [
        { href: "/pricing", label: "Pricing", icon: DollarSign, show: true },
        { href: "/#methodology", label: "How It Works", icon: HelpCircle, show: !isAuthenticated },
        { href: "/usage", label: "Usage Tracking", icon: Activity, show: isAuthenticated },
        { href: "/api-access", label: "API Access", icon: Code, show: isAuthenticated },
        { href: "/api-docs", label: "API Documentation", icon: FileText, show: isAuthenticated },
        { href: "/branding", label: "White-Label Branding", icon: Palette, show: isAuthenticated && hasActiveSubscription },
        { href: "/profile", label: "Profile Settings", icon: User, show: isAuthenticated },
        { href: "/admin", label: "Admin Panel", icon: Shield, show: isAdmin },
      ],
    },
  ];

  const visibleSections = navSections
    .map(section => ({ ...section, items: section.items.filter(item => item.show) }))
    .filter(section => section.items.length > 0);

  return (
    <>
      {/* Top Header - Mobile Only */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 lg:hidden">
        <div className="flex justify-between items-center h-16 px-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo and Brand */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">CE</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-slate-800">ClearEdge Deals</h1>
            </div>
          </Link>

          {/* User Account Section */}
          <div className="flex items-center space-x-2">
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center border border-slate-300">
                  <span className="text-slate-600 font-medium text-sm">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="text-slate-600 hover:text-slate-800 hover:bg-slate-50 p-2"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowAuthModal(true)}
                  size="sm"
                  className="text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                >
                  Sign In
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Desktop Logo & Brand - Always visible on desktop */}
          <div className="hidden lg:flex items-center px-6 py-4 border-b border-slate-200">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">CE</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">ClearEdge Deals</h1>
                <p className="text-xs text-slate-500 leading-none">Real Estate Investment Platform</p>
              </div>
            </Link>
          </div>

          {/* Mobile Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 lg:hidden">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CE</span>
              </div>
              <span className="font-bold text-slate-800">ClearEdge Deals</span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="p-2"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-4 overflow-y-auto">
            {visibleSections.map((section, sectionIndex) => (
              <div
                key={section.title ?? `section-${sectionIndex}`}
                className={sectionIndex > 0 ? 'mt-4 pt-4 border-t border-slate-100' : ''}
              >
                {section.title && (
                  <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {section.title}
                  </p>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Desktop User Section */}
          <div className="hidden lg:block p-4 border-t border-slate-200">
            {isAuthenticated ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center border border-slate-300">
                    <span className="text-slate-600 font-medium text-sm">
                      {user?.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-700">{user?.email}</div>
                    {hasActiveSubscription ? (
                      <div className="text-xs text-green-600 font-medium">Pro Plan</div>
                    ) : (
                      <div className="text-xs text-slate-500">Free Plan</div>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSignOut} 
                  className="w-full border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowAuthModal(true)}
                  size="sm"
                  className="w-full text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                >
                  <User className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
                <Link href="/subscribe" className="block">
                  <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                    Subscribe
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile User Section */}
          <div className="p-4 border-t border-slate-200 lg:hidden">
            {isAuthenticated ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center border border-slate-300">
                    <span className="text-slate-600 font-medium text-xs">
                      {user?.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-700">{user?.email}</div>
                    {hasActiveSubscription && (
                      <div className="text-xs text-green-600 font-medium">Pro Plan</div>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSignOut} 
                  className="w-full border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowAuthModal(true)}
                  size="sm"
                  className="w-full text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                >
                  <User className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
                <Link href="/subscribe" className="block">
                  <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                    Subscribe
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Bottom Navigation */}
      {isAuthenticated && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 lg:hidden">
          <div className="flex justify-around items-center h-14">
            {[
              { href: "/dashboard", label: "Home", icon: LayoutDashboard },
              { href: "/browse", label: "Browse", icon: Search },
              { href: "/property-search", label: "Search", icon: Building2 },
              { href: "/deals", label: "Deals", icon: BarChart3 },
              { href: "/profile", label: "Profile", icon: User },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center flex-1 h-full text-xs transition-colors ${
                    isActive
                      ? "text-blue-600"
                      : "text-slate-400 active:text-slate-600"
                  }`}
                >
                  <Icon className="h-5 w-5 mb-0.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Auth Modal */}
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </>
  );
}