import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth-modal";
import { PropertyMap, getMapboxToken, type MapPoint } from "@/components/property-map";
import { useAuth } from "@/hooks/use-auth";
import { SCORE_TIERS, getScoreTier } from "@/lib/score";
import {
  ArrowRight,
  BarChart3,
  Calculator,
  CheckCircle2,
  FileText,
  Kanban,
  MapPin,
  Target,
  TrendingUp,
} from "lucide-react";

// Illustrative points for the hero map. Logged-out visitors can't read the
// subscription-gated listing feed, so the teaser uses a fixed, clearly labelled
// sample rather than real listings.
function buildSamplePoints(): MapPoint[] {
  const center = { lat: 30.2672, lng: -97.7431 };
  let seed = 7;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: 36 }, (_, i) => {
    const angle = rand() * Math.PI * 2;
    const dist = Math.sqrt(rand()) * 0.12;
    return {
      id: `sample-${i}`,
      lat: center.lat + Math.sin(angle) * dist,
      lng: center.lng + Math.cos(angle) * dist * 1.2,
      score: Math.round(42 + rand() * 54),
      title: "Sample listing",
    };
  });
}

/** Static stand-in for the hero map when no Mapbox token is configured. */
function HeroMapIllustration({ points }: { points: MapPoint[] }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#eef2f6]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,43,111,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(6,43,111,0.06)_1px,transparent_1px)] bg-[size:40px_40px]" />
      <div className="absolute left-[-10%] top-[55%] h-3 w-[120%] -rotate-12 bg-white/80" />
      <div className="absolute left-[40%] top-[-10%] h-[120%] w-3 rotate-6 bg-white/80" />
      {points.map((p, i) => (
        <span
          key={p.id}
          className="absolute h-3.5 w-3.5 rounded-full ring-2 ring-white shadow"
          style={{
            background: getScoreTier(p.score).hex,
            left: `${8 + ((i * 37) % 84)}%`,
            top: `${10 + ((i * 53) % 78)}%`,
          }}
        />
      ))}
    </div>
  );
}

const VALUE_PROPS = [
  { icon: Target, title: "Score every listing", body: "One consistent 0–100 investment score across markets and property types." },
  { icon: Calculator, title: "Underwrite in seconds", body: "Cap rate, cash flow and cash-on-cash computed for every property." },
  { icon: Kanban, title: "Pipeline to close", body: "Move deals from first look to offer to portfolio in one place." },
];

const STEPS = [
  {
    icon: MapPin,
    title: "Explore the map",
    body: "See every scored listing on an interactive map. Filter by score, price and property type to match your buy box.",
  },
  {
    icon: BarChart3,
    title: "Dig into the numbers",
    body: "Open any property for a full financial breakdown, AI underwriting and comparable context.",
  },
  {
    icon: TrendingUp,
    title: "Act with confidence",
    body: "Track deals through your pipeline, generate offers, and watch your portfolio take shape.",
  },
];

export default function Home() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isAuthenticated, hasActiveSubscription } = useAuth();
  const [, setLocation] = useLocation();
  const samplePoints = useMemo(buildSamplePoints, []);
  const hasMapbox = Boolean(getMapboxToken());

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  const handleGetStarted = () => {
    if (isAuthenticated && hasActiveSubscription) {
      setLocation("/dashboard");
    } else if (isAuthenticated) {
      setLocation("/subscribe");
    } else {
      setShowAuthModal(true);
    }
  };

  const handleLearnMore = () => {
    document.getElementById("methodology")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-navy via-brand-blue to-brand-navy text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.12),transparent_55%)]" />
        <div className="absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-brand-orange/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[1fr_1.1fr] lg:px-8">
          <div>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-blue-100 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-orange" />
              Property intelligence for individual investors
            </span>
            <h1 className="font-heading text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl">
              Find your edge in
              <span className="block text-brand-orange">every property.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-blue-100 md:text-xl">
              Compare listings on one consistent score, underwrite deals in seconds, and see the opportunity on the map —
              before anyone else does.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button variant="cta" onClick={handleGetStarted} className="h-auto px-7 py-3.5 text-base font-semibold shadow-lg shadow-brand-orange/25">
                Start exploring properties
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={handleLearnMore}
                className="h-auto border-white/40 bg-white/5 px-7 py-3.5 text-base text-white hover:bg-white hover:text-brand-navy"
              >
                See how it works
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-blue-100">
              {["Investment score on every listing", "Cash flow & cap rate built in", "Free plan to start"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-brand-orange" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Map teaser */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl shadow-black/30 ring-1 ring-white/10">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
                  <MapPin className="h-4 w-4 text-brand-orange" />
                  Opportunity map
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                  Sample data
                </span>
              </div>
              <div className="h-[340px] md:h-[400px]">
                {hasMapbox ? (
                  <PropertyMap points={samplePoints} interactive={false} introAnimation height="100%" />
                ) : (
                  <HeroMapIllustration points={samplePoints} />
                )}
              </div>
            </div>
            {/* Floating score card */}
            <div className="absolute -bottom-6 -left-4 hidden w-56 rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-xl sm:block">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Investment score</p>
              <div className="mt-2 space-y-1.5">
                {Object.values(SCORE_TIERS).map((tier) => (
                  <div key={tier.key} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: tier.hex }} />
                    <span className="font-medium">{tier.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value props (replaces unverified headline stats) */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-8">
          {VALUE_PROPS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand-blue">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-base font-semibold text-brand-navy">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Methodology */}
      <section id="methodology" className="scroll-mt-16 bg-slate-50 py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-orange">How it works</p>
            <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight text-brand-navy md:text-4xl">
              Stop guessing. Start comparing.
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Most platforms show you listings. ClearEdge Props helps you understand them — turning property data into a
              cleaner decision view.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <div key={title} className="relative rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <span className="absolute right-6 top-6 font-heading text-4xl font-bold text-slate-100">0{i + 1}</span>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue text-white shadow-md shadow-brand-blue/20">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-brand-navy">{title}</h3>
                <p className="mt-2 leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3">
            {[
              { icon: FileText, title: "Clear property snapshots", body: "Listing details, price signals and location context in one summary." },
              { icon: Target, title: "Comparable scoring", body: "Repeatable criteria so every property is measured with the same lens." },
              { icon: TrendingUp, title: "Faster decisions", body: "Focus your research time on the opportunities worth a deeper look." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-3 p-2">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" />
                <div>
                  <p className="font-semibold text-slate-800">{title}</p>
                  <p className="text-sm text-slate-600">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-navy to-brand-blue px-8 py-12 text-white shadow-xl md:px-14 md:py-14">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-orange/20 blur-3xl" />
            <div className="relative grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
              <div>
                <h2 className="font-heading text-3xl font-bold tracking-tight">Plans that grow with your portfolio</h2>
                <p className="mt-3 text-blue-100">
                  Start free, then upgrade for the full scored property feed, map exploration, AI underwriting and your deal
                  pipeline.
                </p>
              </div>
              <div className="flex flex-col gap-3 md:items-end">
                <Button variant="cta" onClick={handleGetStarted} className="h-auto px-7 py-3.5 text-base font-semibold">
                  Get started free
                </Button>
                <Link href="/pricing" className="text-sm font-medium text-blue-100 underline-offset-4 hover:text-white hover:underline">
                  Compare plans →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-navy py-12 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-[2fr_1fr_1fr]">
            <div>
              <h3 className="font-heading text-lg font-semibold">ClearEdge Props</h3>
              <p className="mt-1 text-sm font-medium text-brand-orange">Find your edge in every property.</p>
              <p className="mt-3 max-w-sm text-sm text-blue-100/80">
                Where property search becomes property intelligence — compare opportunities with confidence.
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-blue-100/80">
                <li><a href="#methodology" className="transition-colors hover:text-white">How it works</a></li>
                <li><Link href="/pricing" className="transition-colors hover:text-white">Pricing</Link></li>
                <li><Link href="/browse" className="transition-colors hover:text-white">Browse properties</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Developers</h4>
              <ul className="space-y-2 text-sm text-blue-100/80">
                <li><Link href="/api-docs" className="transition-colors hover:text-white">API documentation</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-white/10 pt-8 text-center text-sm text-blue-100/60">
            <p>&copy; {new Date().getFullYear()} ClearEdge Props. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </div>
  );
}
