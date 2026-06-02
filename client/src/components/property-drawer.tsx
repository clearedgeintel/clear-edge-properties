import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalculationBreakdown } from "./calculation-breakdown";
import { Heart, ChevronLeft, ChevronRight, FileText, Brain, Calculator, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Property, UserProperty } from "@shared/schema";
import { formatPrice, formatCurrency } from "@/lib/format";
import { ScoreBadge } from "./score-badge";
import { LetterOfIntentModal } from "./letter-of-intent-modal";
import { AICommentary } from "./ai-commentary";
import { AIOfferHelper } from "./ai-offer-helper";
import { AIUnderwriting } from "./ai-underwriting";
import { AddToPipelineButton } from "./add-to-pipeline-button";

interface PropertyDrawerProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TrackedItem = UserProperty & { property: Property | null };

export function PropertyDrawer({ property, open, onOpenChange }: PropertyDrawerProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showLoiModal, setShowLoiModal] = useState(false);
  const [showOfferHelper, setShowOfferHelper] = useState(false);
  const [showUnderwriting, setShowUnderwriting] = useState(false);
  const { toast } = useToast();
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  // Tracked (watchlist) items; derive tracking status from the list by zpid.
  const { data: watchlist } = useQuery<TrackedItem[]>({
    queryKey: ['/api/watchlist'],
    enabled: !!session,
  });

  const isTracked = !!property && !!watchlist?.some((item) => item.zpid === property.zpid);

  // Fetch comparable properties (same ZIP, exclude current)
  const { data: allProperties } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
    enabled: !!property,
  });

  const comparables = property && allProperties
    ? allProperties
        .filter(p => p.zpid !== property.zpid && p.addressZip === property.addressZip)
        .sort(
          (a, b) =>
            Math.abs(Number(a.investmentScorePercent) - Number(property.investmentScorePercent)) -
            Math.abs(Number(b.investmentScorePercent) - Number(property.investmentScorePercent))
        )
        .slice(0, 4)
    : [];

  const watchlistMutation = useMutation({
    mutationFn: async ({ action, zpid }: { action: 'add' | 'remove', zpid: string }) => {
      if (action === 'add') {
        return apiRequest('POST', '/api/watchlist', { zpid });
      } else {
        return apiRequest('DELETE', `/api/watchlist/${zpid}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist'] });
    },
  });

  if (!property) return null;

  const galleryImages = [property.imgMain].filter(Boolean) as string[];
  const images = galleryImages.length > 0 ? galleryImages : [
    "https://images.unsplash.com/photo-1605146769289-440113cc3d00?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
  ];

  const sqFt = Number(property.sizeSqFt ?? property.livingAreaSqFt);
  const price = Number(property.price);
  const score = Number(property.investmentScorePercent);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const selectImage = (index: number) => {
    setCurrentImageIndex(index);
  };

  const handleWatchlistToggle = async () => {
    if (!property || !user) return;

    try {
      const action = isTracked ? 'remove' : 'add';
      await watchlistMutation.mutateAsync({ action, zpid: property.zpid });

      toast({
        title: action === 'add' ? "Added to Watchlist" : "Removed from Watchlist",
        description: action === 'add'
          ? "Property added to your watchlist"
          : "Property removed from your watchlist",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update watchlist",
        variant: "destructive",
      });
    }
  };

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-[90vw] overflow-y-auto sm:max-w-[80vw] lg:max-w-[75vw]">
        <SheetHeader>
          <SheetTitle>{property.address}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Image Carousel */}
          <div className="relative">
            <img
              src={images[currentImageIndex]}
              alt={`Property image ${currentImageIndex + 1}`}
              className="w-full h-64 object-cover rounded-lg"
            />
            <div className="absolute top-4 right-4">
              <CalculationBreakdown property={property} />
            </div>

            {images.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100"
                  onClick={previousImage}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Thumbnail Navigation */}
          {images.length > 1 && (
            <div className="flex space-x-2 overflow-x-auto">
              {images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className={`w-16 h-12 object-cover rounded cursor-pointer border-2 ${
                    index === currentImageIndex ? 'border-blue-500' : 'border-transparent hover:border-slate-300'
                  }`}
                  onClick={() => selectImage(index)}
                />
              ))}
            </div>
          )}

          {/* Compact Property Header */}
          <div className="bg-brand-light rounded-lg p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-slate-900">{property.address}</h3>
              <div className="flex items-center gap-2">
                {property.homeType && (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">{property.homeType}</Badge>
                )}
                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-xs">{property.addressCity}, {property.addressState}</Badge>
              </div>
            </div>

            {/* Compact Property Details */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="text-sm">
                <span className="text-slate-600">Beds/Baths:</span>
                <span className="ml-2 font-medium text-slate-900">{property.numBeds ?? 'N/A'}/{property.numBaths ?? 'N/A'}</span>
              </div>
              <div className="text-sm">
                <span className="text-slate-600">Square Feet:</span>
                <span className="ml-2 font-medium text-slate-900">{sqFt ? sqFt.toLocaleString() : 'N/A'}</span>
              </div>
              <div className="text-sm">
                <span className="text-slate-600">Year Built:</span>
                <span className="ml-2 font-medium text-slate-900">{property.yearBuilt || 'N/A'}</span>
              </div>
              <div className="text-sm">
                <span className="text-slate-600">Market:</span>
                <span className="ml-2 font-medium text-slate-900">{property.searchMarket || 'N/A'}</span>
              </div>
            </div>

            {/* Key Financial Metrics Row */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-lg p-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">List Price</p>
                <p className="text-sm font-bold text-slate-900">{formatPrice(property.price ?? '')}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Score</p>
                <p className="text-sm font-bold text-slate-900">{Number.isFinite(score) ? `${score}/100` : 'N/A'}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">$/Sq Ft</p>
                <p className="text-sm font-bold text-slate-900">
                  {property.pricePerSqFt
                    ? `$${Number(property.pricePerSqFt).toFixed(0)}`
                    : (sqFt && price ? `$${(price / sqFt).toFixed(0)}` : 'N/A')}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Est. ROI</p>
                <p className="text-sm font-bold text-green-600">{property.cashOnCashRoi ? `${Number(property.cashOnCashRoi).toFixed(1)}%` : 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Investment Analysis */}
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-2">
              <h4 className="text-lg font-semibold text-slate-900">Investment Analysis</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {property.capRatePercent != null && (
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Cap Rate</p>
                  <p className="text-lg font-bold text-slate-900">{Number(property.capRatePercent).toFixed(2)}%</p>
                </div>
              )}
              {property.cashOnCashRoi != null && (
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Cash-on-Cash ROI</p>
                  <p className="text-lg font-bold text-slate-900">{Number(property.cashOnCashRoi).toFixed(2)}%</p>
                </div>
              )}
              {property.monthlyCashFlow != null && (
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Monthly Cash Flow</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(property.monthlyCashFlow)}</p>
                </div>
              )}
              {property.annualCashFlow != null && (
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Annual Cash Flow</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(property.annualCashFlow)}</p>
                </div>
              )}
              {property.dscr != null && (
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">DSCR</p>
                  <p className="text-lg font-bold text-slate-900">{Number(property.dscr).toFixed(2)}</p>
                </div>
              )}
              {property.investmentScorePercent != null && (
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Investment Score</p>
                  <p className="text-lg font-bold text-slate-900">{Number(property.investmentScorePercent).toFixed(0)}/100</p>
                </div>
              )}
            </div>
          </div>

          {/* Property Details */}
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-2">
              <h4 className="text-lg font-semibold text-slate-900">Property Details</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {property.pricePerSqFt != null && (
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Price per Sq Ft</p>
                  <p className="text-lg font-bold text-slate-900">${Number(property.pricePerSqFt).toFixed(2)}</p>
                </div>
              )}
              {property.rentZestimate != null && (
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Rent Estimate</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(property.rentZestimate)}</p>
                </div>
              )}
              {property.zestimate != null && (
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Zestimate</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(property.zestimate)}</p>
                </div>
              )}
              {property.listPrice != null && (
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">List Price</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(property.listPrice)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3 pt-6 border-t border-slate-200">
            <AddToPipelineButton
              property={property}
              variant="outline"
              size="sm"
              className="col-span-3 mb-2"
            />
            <Button
              onClick={handleWatchlistToggle}
              disabled={watchlistMutation.isPending}
              variant={isTracked ? "outline" : "default"}
              className={`w-full ${isTracked
                ? 'border-red-300 text-red-700 hover:bg-red-50'
                : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0'
              }`}
            >
              <Heart className={`mr-2 h-4 w-4 ${isTracked ? 'fill-current' : ''}`} />
              {isTracked ? 'Remove' : 'Save'}
            </Button>

            <Button
              onClick={() => setShowOfferHelper(true)}
              className="w-full bg-gradient-to-r from-brand-blue to-brand-navy hover:opacity-90 text-white border-0"
            >
              <Brain className="mr-2 h-4 w-4" />
              AI Offer Helper
            </Button>

            <Button
              onClick={() => setShowUnderwriting(true)}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
            >
              <Calculator className="mr-2 h-4 w-4" />
              AI Underwriting
            </Button>

            <Button
              onClick={() => setShowLoiModal(true)}
              className="w-full bg-gradient-to-r from-brand-blue to-brand-navy hover:opacity-90 text-white border-0"
            >
              <FileText className="mr-2 h-4 w-4" />
              Letter of Intent
            </Button>
          </div>

          {/* Comparable Properties */}
          {comparables.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Building className="h-4 w-4" />
                Comparable Properties ({property.addressZip})
              </h3>
              <div className="space-y-2">
                {comparables.map((comp) => (
                  <div key={comp.zpid} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{comp.address}</p>
                      <p className="text-xs text-slate-500">
                        {formatCurrency(comp.price)} &middot; {comp.numBeds ?? 'N/A'}bd/{comp.numBaths ?? 'N/A'}ba &middot; {comp.sizeSqFt ? Number(comp.sizeSqFt).toLocaleString() : 'N/A'} sqft
                      </p>
                    </div>
                    <ScoreBadge investmentScorePercent={Number(comp.investmentScorePercent) || 0} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Commentary */}
          <AICommentary property={property} />
        </div>
        </SheetContent>
      </Sheet>

      {/* Letter of Intent Modal */}
      <LetterOfIntentModal
        property={property}
        open={showLoiModal}
        onOpenChange={setShowLoiModal}
      />

      {/* AI Offer Helper Modal */}
      <AIOfferHelper
        property={property}
        open={showOfferHelper}
        onOpenChange={setShowOfferHelper}
      />

      {/* AI Underwriting Modal */}
      <AIUnderwriting
        property={property}
        open={showUnderwriting}
        onOpenChange={setShowUnderwriting}
      />
    </>
  );
}
