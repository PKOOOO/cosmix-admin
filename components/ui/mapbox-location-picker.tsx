"use client";
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Search, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface LocationPickerProps {
  onLocationSelect: (location: { latitude: number; longitude: number; address: string }) => void;
  initialLocation?: { latitude: number; longitude: number; address: string };
  disabled?: boolean;
}

interface SearchResult {
  place_name: string;
  center: [number, number];
  text: string;
}

export const MapboxLocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  initialLocation,
  disabled = false
}) => {
  const [viewState, setViewState] = useState({
    longitude: initialLocation?.longitude || 2.3522, // Default to Paris
    latitude: initialLocation?.latitude || 48.8566,
    zoom: 13
  });

  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(initialLocation || null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isWebView, setIsWebView] = useState(false);

  const mapRef = useRef<any>(null);

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_KEY;

  // Detect if running in WebView
  useEffect(() => {
    const checkWebView = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      // Check for React Native WebView or other mobile WebView indicators
      const isRNWebView = userAgent.includes('ReactNativeWebView');
      const isAndroidWebView = userAgent.includes('wv');
      const isIOSWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(userAgent);

      return isRNWebView || isAndroidWebView || isIOSWebView;
    };

    setIsWebView(checkWebView());
  }, []);

  // Handle map click to select location
  const handleMapClick = useCallback((event: any) => {
    if (disabled) return;

    const { lng, lat } = event.lngLat;

    // Reverse geocode to get address
    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`
    )
      .then(response => response.json())
      .then(data => {
        const address = data.features[0]?.place_name || "Unknown location";
        const location = { latitude: lat, longitude: lng, address };
        setSelectedLocation(location);
        onLocationSelect(location);
        toast.success('Location selected!');
      })
      .catch(error => {
        console.error('Error reverse geocoding:', error);
        toast.error('Failed to get address for selected location');
      });
  }, [disabled, onLocationSelect, MAPBOX_TOKEN]);

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data.features || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, MAPBOX_TOKEN]);

  // Handle search result selection
  const handleSearchResultSelect = useCallback((result: SearchResult) => {
    const [lng, lat] = result.center;
    const location = { latitude: lat, longitude: lng, address: result.place_name };

    setSelectedLocation(location);
    setViewState(prev => ({
      ...prev,
      longitude: lng,
      latitude: lat,
      zoom: 15
    }));
    onLocationSelect(location);
    setShowSearchResults(false);
    setSearchQuery(result.place_name);
    toast.success('Location selected!');
  }, [onLocationSelect]);

  // Handle Enter key in search
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <Card className="w-full overflow-hidden">

      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="flex gap-2 mt-4">
            <Input
              placeholder="Search for a location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              disabled={disabled}
              className="flex-1"
            />
            <Button
              onClick={handleSearch}
              disabled={disabled || isSearching || !searchQuery.trim()}
              size="sm"
              variant="outline"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Search Results */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleSearchResultSelect(result)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="text-sm font-medium">{result.text}</div>
                  <div className="text-xs text-gray-500">{result.place_name}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Location Info */}
        {selectedLocation && (
          <div className="p-4 bg-brand-cream rounded-lg border border-brand-beige">
            <div className="flex items-start gap-3">
              <div className="bg-brand-dark text-white p-2 rounded-full">
                <Check className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-brand-dark">Selected Location</h4>
                <p className="text-sm text-gray-600 mt-1">{selectedLocation.address}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Coordinates: {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Map - Full Width at Bottom */}
      <div className="h-96 w-full overflow-hidden">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          onClick={handleMapClick}
          mapboxAccessToken={MAPBOX_TOKEN}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          cursor={disabled ? 'default' : 'crosshair'}
          attributionControl={false}
          // WebView optimizations
          preserveDrawingBuffer={isWebView}
          antialias={true}
          failIfMajorPerformanceCaveat={false}
        >
          {/* Selected Location Marker */}
          {selectedLocation && (
            <Marker
              longitude={selectedLocation.longitude}
              latitude={selectedLocation.latitude}
              anchor="bottom"
            >
              <div className="bg-brand-dark text-white p-2 rounded-full shadow-lg">
                <MapPin className="h-4 w-4" />
              </div>
            </Marker>
          )}
        </Map>
      </div>
    </Card>
  );
};
