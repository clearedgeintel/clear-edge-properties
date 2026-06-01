import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Property } from '@shared/schema';
import { ScoreBadge } from './score-badge';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface PropertyMapProps {
  properties: Property[];
  onPropertyClick?: (property: Property) => void;
  selectedProperty?: Property | null;
  height?: string;
}

interface PropertyWithCoords extends Property {
  lat?: number;
  lng?: number;
}

export function PropertyMap({
  properties,
  onPropertyClick,
  selectedProperty,
  height = "400px"
}: PropertyMapProps) {
  const [propertiesWithCoords, setPropertiesWithCoords] = useState<PropertyWithCoords[]>([]);
  const [loading, setLoading] = useState(true);

  // Simple geocoding fallback for properties missing lat/lng.
  const geocodeAddress = async (address: string, city: string, state: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const fullAddress = `${address}, ${city}, ${state}`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  useEffect(() => {
    const resolveProperties = async () => {
      setLoading(true);
      const resolved: PropertyWithCoords[] = [];

      for (const property of properties.slice(0, 20)) { // Limit to first 20 properties
        // Prefer stored coordinates (numeric columns arrive as strings).
        const storedLat = property.latitude != null ? Number(property.latitude) : NaN;
        const storedLng = property.longitude != null ? Number(property.longitude) : NaN;

        if (!isNaN(storedLat) && !isNaN(storedLng)) {
          resolved.push({ ...property, lat: storedLat, lng: storedLng });
          continue;
        }

        // Fall back to geocoding when coordinates are missing.
        const coords = await geocodeAddress(
          property.address ?? '',
          property.addressCity ?? '',
          property.addressState ?? ''
        );
        resolved.push({
          ...property,
          lat: coords?.lat,
          lng: coords?.lng
        });

        // Small delay to be respectful to the geocoding service
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setPropertiesWithCoords(resolved.filter(p => p.lat != null && p.lng != null));
      setLoading(false);
    };

    if (properties.length > 0) {
      resolveProperties();
    } else {
      setPropertiesWithCoords([]);
      setLoading(false);
    }
  }, [properties]);

  // Calculate center of map based on properties
  const getMapCenter = (): [number, number] => {
    if (propertiesWithCoords.length === 0) {
      return [39.8283, -98.5795]; // Center of US
    }

    const validCoords = propertiesWithCoords.filter(p => p.lat != null && p.lng != null);
    if (validCoords.length === 0) {
      return [39.8283, -98.5795];
    }

    const avgLat = validCoords.reduce((sum, p) => sum + p.lat!, 0) / validCoords.length;
    const avgLng = validCoords.reduce((sum, p) => sum + p.lng!, 0) / validCoords.length;

    return [avgLat, avgLng];
  };

  // Create custom icon for selected property
  const createSelectedIcon = () => {
    return L.divIcon({
      className: 'custom-marker selected-marker',
      html: `<div style="background-color: #ef4444; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [25, 25],
      iconAnchor: [12, 12]
    });
  };

  // Create custom icon based on score
  const createScoreIcon = (score: number) => {
    const getColor = (score: number) => {
      if (score >= 85) return "#10b981"; // Green
      if (score >= 75) return "#f59e0b"; // Yellow
      if (score >= 60) return "#f97316"; // Orange
      return "#ef4444"; // Red
    };

    return L.divIcon({
      className: 'custom-marker score-marker',
      html: `<div style="background-color: ${getColor(score)}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px;">${score}</div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 rounded-lg"
        style={{ height }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200">
      <MapContainer
        center={getMapCenter()}
        zoom={10}
        style={{ height, width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {propertiesWithCoords.map((property) => {
          if (property.lat == null || property.lng == null) return null;

          const isSelected = selectedProperty?.zpid === property.zpid;
          const score = Math.round(Number(property.investmentScorePercent ?? 0));
          const price = property.price != null ? Number(property.price) : null;
          const sqft = property.sizeSqFt != null ? Number(property.sizeSqFt) : null;

          return (
            <Marker
              key={property.zpid}
              position={[property.lat, property.lng]}
              icon={isSelected ? createSelectedIcon() : createScoreIcon(score)}
              eventHandlers={{
                click: () => onPropertyClick?.(property)
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm">{property.address}</h3>
                    <ScoreBadge investmentScorePercent={score} className="ml-2" />
                  </div>
                  <p className="text-xs text-gray-600 mb-1">
                    {property.addressCity}, {property.addressState}
                  </p>
                  <p className="text-sm font-medium text-green-600 mb-2">
                    ${price != null ? price.toLocaleString() : '-'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <span>{property.numBeds} bed</span>
                    <span>•</span>
                    <span>{property.numBaths} bath</span>
                    <span>•</span>
                    <span>{sqft != null ? sqft.toLocaleString() : '-'} sqft</span>
                  </div>
                  <button
                    onClick={() => onPropertyClick?.(property)}
                    className="w-full bg-blue-600 text-white text-xs py-1 px-2 rounded hover:bg-blue-700 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
