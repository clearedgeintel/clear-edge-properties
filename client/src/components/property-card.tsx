import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalculationBreakdown } from "./calculation-breakdown";
import { AddToPipelineButton } from "./add-to-pipeline-button";
import { Camera } from "lucide-react";
import type { Property } from "@shared/schema";
import { formatPrice } from "@/lib/format";

interface PropertyCardProps {
  property: Property;
  isBlurred?: boolean;
  onClick?: () => void;
}

const STOCK_IMAGE =
  "https://images.unsplash.com/photo-1605146769289-440113cc3d00?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";

export function PropertyCard({ property, isBlurred = false, onClick }: PropertyCardProps) {
  const [imageError, setImageError] = useState(false);

  // New shape exposes a single main image; galleries derive from [imgMain].
  const images = [property.imgMain].filter(Boolean) as string[];
  const hasImages = images.length > 0;
  const isUsingStockImages = !hasImages || Boolean(images[0]?.includes("unsplash.com"));

  const getImageSrc = () => {
    if (hasImages && !imageError) {
      return images[0];
    }
    return STOCK_IMAGE;
  };

  const beds = property.numBeds ?? 0;
  const baths = Number(property.numBaths ?? 0);
  const sqft = Number(property.sizeSqFt ?? property.livingAreaSqFt ?? 0);
  const roi = property.cashOnCashRoi;

  return (
    <Card
      className={`overflow-hidden hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 cursor-pointer border-0 bg-gradient-to-br from-white to-blue-50/30 ${
        isBlurred ? 'relative' : ''
      }`}
      onClick={onClick}
    >
      <div className="relative">
        <img
          src={getImageSrc()}
          alt={property.address ?? "Property"}
          className="w-full h-48 object-cover"
          onError={() => setImageError(true)}
        />

        {/* Show indicator when only a stock photo is available */}
        {(!hasImages || isUsingStockImages) && (
          <div className="absolute top-3 left-3">
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
              Stock Photo
            </Badge>
          </div>
        )}

        <div className="absolute top-3 right-3 flex gap-2">
          <CalculationBreakdown property={property} />
        </div>

        {property.createdAt && new Date(property.createdAt).getTime() > Date.now() - 3 * 24 * 60 * 60 * 1000 && (
          <div className="absolute top-3 left-3 mt-10">
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-md">
              New
            </Badge>
          </div>
        )}

        {/* Authentic photo indicator */}
        {hasImages && !isUsingStockImages && (
          <div className="absolute bottom-3 left-3">
            <Badge className="bg-blue-600 text-white border-0 shadow-md text-xs">
              <Camera className="h-3 w-3 mr-1" />
              Authentic Photos
            </Badge>
          </div>
        )}

        {isBlurred && (
          <div className="absolute inset-0 bg-white bg-opacity-50 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <i className="fas fa-lock text-slate-400 text-3xl mb-2"></i>
              <p className="text-slate-600 font-medium">Subscribe to View</p>
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-slate-800 mb-1">
          {isBlurred
            ? `${property.addressCity ?? ""}, ${property.addressState ?? ""} ${property.addressZip ?? ""}`
            : property.address}
        </h3>
        <p className="text-slate-600 text-sm mb-2">
          {beds} bed, {baths} bath • {sqft.toLocaleString()} sq ft
        </p>

        {/* Property source/ID information */}
        <div className="flex items-center gap-2 mb-2">
          {property.homeType && (
            <Badge variant="outline" className="text-xs capitalize">
              {property.homeType.replace(/_/g, " ").toLowerCase()}
            </Badge>
          )}
          {property.zpid && (
            <Badge variant="outline" className="text-xs text-blue-700 border-blue-200">
              ID: {property.zpid}
            </Badge>
          )}
        </div>
        <div className="flex justify-between items-center mb-3">
          <p className="text-xl font-bold text-slate-800">
            {formatPrice(property.price ?? 0)}
          </p>
          {roi != null && roi !== "" && (
            <p className="text-sm text-slate-600">
              Est. ROI: {Number(roi).toFixed(1)}%
            </p>
          )}
        </div>

        {/* Add to Pipeline Button */}
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <AddToPipelineButton
            property={property}
            variant="outline"
            size="sm"
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
}
