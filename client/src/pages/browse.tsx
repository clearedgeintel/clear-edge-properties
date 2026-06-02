import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PropertyCard } from "@/components/property-card";
import { PropertyDrawer } from "@/components/property-drawer";
import { PropertyMap } from "@/components/property-map";
import { PropertyTable } from "@/components/property-table";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Search, Grid3X3, Map, Table2, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Property, PropertySearch } from "@shared/schema";

export default function Browse() {
  const { hasActiveSubscription } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map' | 'table'>('grid');
  
  const [searchParams, setSearchParams] = useState<PropertySearch>({
    sortBy: 'score-desc',
    limit: 20,
  });

  const { data: properties = [], isLoading, refetch } = useQuery<Property[]>({
    queryKey: ['/api/properties', searchParams],
    enabled: hasActiveSubscription,
  });

  const handlePropertyClick = (property: Property) => {
    setSelectedProperty(property);
    setDrawerOpen(true);
  };

  const handleSearch = () => {
    refetch();
  };

  const handleClearFilters = () => {
    setSearchParams({
      sortBy: 'score-desc',
      limit: 20,
    });
  };

  const updateSearchParam = (key: keyof PropertySearch, value: any) => {
    setSearchParams(prev => ({ ...prev, [key]: value }));
  };

  if (!hasActiveSubscription) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">
            Subscription Required
          </h1>
          <p className="text-slate-600 mb-6">
            You need an active subscription to browse properties. 
            Start your free trial to access our premium listings.
          </p>
          <Button onClick={() => window.location.href = '/subscribe'}>
            Start Free Trial
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">Browse Properties</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">Find your next investment opportunity with authentic Zillow photos and comprehensive property data</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
              <Camera className="h-3 w-3 mr-1" />
              Authentic Zillow Photos
            </Badge>
            <Badge className="bg-green-100 text-green-800 border border-green-200">
              Multi-Platform Data
            </Badge>
          </div>
        </div>

        {/* Enhanced Search Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 mb-8 overflow-hidden">
          {/* Search Header */}
          <div className="bg-gradient-to-r from-brand-blue to-brand-navy px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg">
                <Search className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Property Search & Filters</h2>
                <p className="text-blue-100 text-sm">Use advanced filters to find properties that match your investment criteria</p>
              </div>
            </div>
          </div>

          {/* Search Content */}
          <div className="p-8">
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="md:col-span-2">
                <Label htmlFor="search" className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Search Location</Label>
                <div className="relative mt-3">
                  <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                  <Input
                    id="search"
                    placeholder="Enter address, city, or ZIP code"
                    className="pl-12 h-12 text-lg border-2 border-slate-200 focus:border-blue-600 rounded-xl"
                    value={searchParams.query || ''}
                    onChange={(e) => updateSearchParam('query', e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Price Range</Label>
                <Select 
                  value={searchParams.priceMin && searchParams.priceMax 
                    ? `${searchParams.priceMin}-${searchParams.priceMax}` 
                    : 'any'
                  }
                  onValueChange={(value) => {
                    if (value === 'any' || value === '') {
                      updateSearchParam('priceMin', undefined);
                      updateSearchParam('priceMax', undefined);
                    } else {
                      const [min, max] = value.split('-').map(Number);
                      updateSearchParam('priceMin', min || undefined);
                      updateSearchParam('priceMax', max === undefined ? undefined : max);
                    }
                  }}
                >
                  <SelectTrigger className="mt-3 h-12 border-2 border-slate-200 focus:border-blue-600 rounded-xl text-lg">
                    <SelectValue placeholder="Any Price" />
                  </SelectTrigger>
                  <SelectContent className="border-2 border-slate-300 shadow-xl">
                    <div className="bg-blue-600 text-white px-3 py-2 text-sm font-semibold border-b border-slate-200">
                      Price Range
                    </div>
                    <SelectItem value="any" className="hover:bg-slate-100">Any Price</SelectItem>
                    <SelectItem value="0-300000" className="hover:bg-slate-100">Under $300k</SelectItem>
                    <SelectItem value="300000-500000" className="hover:bg-slate-100">$300k - $500k</SelectItem>
                    <SelectItem value="500000-750000" className="hover:bg-slate-100">$500k - $750k</SelectItem>
                    <SelectItem value="750000-1000000" className="hover:bg-slate-100">$750k - $1M</SelectItem>
                    <SelectItem value="1000000-" className="hover:bg-slate-100">$1M+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Score Range</Label>
                <Select 
                  value={searchParams.scoreMin && searchParams.scoreMax 
                    ? `${searchParams.scoreMin}-${searchParams.scoreMax}` 
                    : 'any'
                  }
                  onValueChange={(value) => {
                    if (value === 'any' || value === '') {
                      updateSearchParam('scoreMin', undefined);
                      updateSearchParam('scoreMax', undefined);
                    } else {
                      const [min, max] = value.split('-').map(Number);
                      updateSearchParam('scoreMin', min);
                      updateSearchParam('scoreMax', max);
                    }
                  }}
                >
                  <SelectTrigger className="mt-3 h-12 border-2 border-slate-200 focus:border-blue-600 rounded-xl text-lg">
                    <SelectValue placeholder="Any Score" />
                  </SelectTrigger>
                  <SelectContent className="border-2 border-slate-300 shadow-xl">
                    <div className="bg-brand-blue text-white px-3 py-2 text-sm font-semibold border-b border-slate-200">
                      Investment Score
                    </div>
                    <SelectItem value="any" className="hover:bg-slate-100">Any Score</SelectItem>
                    <SelectItem value="80-100" className="hover:bg-slate-100">Excellent (80-100)</SelectItem>
                    <SelectItem value="60-79" className="hover:bg-slate-100">Good (60-79)</SelectItem>
                    <SelectItem value="0-59" className="hover:bg-slate-100">Fair (Under 60)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          
            <div className="flex flex-wrap gap-4 items-center justify-between border-t border-slate-200 pt-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-3">
                  <Label className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Sort by:</Label>
                  <Select 
                    value={searchParams.sortBy || 'score-desc'}
                    onValueChange={(value) => updateSearchParam('sortBy', value)}
                  >
                    <SelectTrigger className="w-48 h-10 border-2 border-slate-200 focus:border-blue-600 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-2 border-slate-300 shadow-xl">
                      <div className="bg-blue-600 text-white px-3 py-2 text-sm font-semibold border-b border-slate-200">
                        Sort Options
                      </div>
                      <SelectItem value="score-desc" className="hover:bg-slate-100">Highest Score</SelectItem>
                      <SelectItem value="price-asc" className="hover:bg-slate-100">Lowest Price</SelectItem>
                      <SelectItem value="newest" className="hover:bg-slate-100">Newest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleSearch}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold"
                >
                  Apply Filters
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleClearFilters}
                  className="border-2 border-slate-300 hover:border-blue-600 px-6 py-3 rounded-xl font-semibold"
                >
                  Clear All
                </Button>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200'}`}
                >
                  <Grid3X3 className="h-4 w-4" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-2 rounded-lg ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200'}`}
                >
                  <Table2 className="h-4 w-4" />
                  Table
                </Button>
                <Button
                  variant={viewMode === 'map' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('map')}
                  className={`flex items-center gap-2 rounded-lg ${viewMode === 'map' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200'}`}
                >
                  <Map className="h-4 w-4" />
                  Map
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Properties Display - Grid, Table, or Map */}
        {isLoading ? (
          viewMode === 'grid' ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
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
          ) : viewMode === 'table' ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-8 space-y-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="w-16 h-12 bg-slate-200 rounded animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded animate-pulse w-1/2" />
                      <div className="h-3 bg-slate-200 rounded animate-pulse w-1/3" />
                    </div>
                    <div className="w-20 h-6 bg-slate-200 rounded animate-pulse" />
                    <div className="w-24 h-4 bg-slate-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="w-full h-96 bg-slate-200 animate-pulse flex items-center justify-center">
                <p className="text-slate-500">Loading map...</p>
              </div>
            </div>
          )
        ) : properties.length > 0 ? (
          <>
            {viewMode === 'grid' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property) => (
                  <PropertyCard
                    key={property.zpid}
                    property={property}
                    onClick={() => handlePropertyClick(property)}
                  />
                ))}
              </div>
            )}
            
            {viewMode === 'table' && (
              <PropertyTable
                properties={properties}
                onPropertyClick={handlePropertyClick}
              />
            )}
            
            {viewMode === 'map' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <PropertyMap
                  properties={properties}
                  onPropertyClick={handlePropertyClick}
                  selectedProperty={selectedProperty}
                  height="600px"
                />
              </div>
            )}
            
            {(viewMode === 'grid' || viewMode === 'table') && properties.length >= (searchParams.limit || 20) && (
              <div className="text-center mt-8">
                <Button 
                  variant="outline"
                  onClick={() => {
                    updateSearchParam('limit', (searchParams.limit || 20) + 20);
                    handleSearch();
                  }}
                >
                  Load More Properties
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-600 text-lg mb-4">No properties found matching your criteria</p>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      <PropertyDrawer 
        property={selectedProperty}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
