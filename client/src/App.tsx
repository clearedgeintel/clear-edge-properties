import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/navigation";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import Browse from "@/pages/browse";
import Recommendations from "@/pages/recommendations";
import MarketTrends from "@/pages/market-trends";
import Portfolio from "@/pages/portfolio";
import Deals from "@/pages/deals";
import DealComparison from "@/pages/deal-comparison";
import EquityToolkit from "@/pages/equity-toolkit";
import Admin from "@/pages/admin";
import Subscribe from "@/pages/subscribe";
import Pricing from "@/pages/pricing";
import Branding from "@/pages/branding";
import Usage from "@/pages/usage";
import ApiAccess from "@/pages/api-access";
import PropertySearch from "@/pages/property-search";
import AgentLookup from "@/pages/agent-lookup";
import Buyers from "@/pages/buyers";
import ApiDocs from "@/pages/api-docs";
import PropertyDetails from "@/pages/property-details";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/profile" component={Profile} />
      <Route path="/market-trends" component={MarketTrends} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/recommendations" component={Recommendations} />
      <Route path="/deals" component={Deals} />
      <Route path="/browse" component={Browse} />
      <Route path="/property-details" component={PropertyDetails} />
      <Route path="/deal-comparison" component={DealComparison} />
      <Route path="/equity-toolkit" component={EquityToolkit} />
      <Route path="/admin" component={Admin} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/branding" component={Branding} />
      <Route path="/usage" component={Usage} />
      <Route path="/api-access" component={ApiAccess} />
      <Route path="/property-search" component={PropertySearch} />
      <Route path="/agent-lookup" component={AgentLookup} />
      <Route path="/buyers" component={Buyers} />
      <Route path="/api-docs" component={ApiDocs} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-slate-50 lg:flex">
          <Navigation />
          <main className="flex-1 lg:ml-0 pb-16 lg:pb-0">
            <Router />
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
