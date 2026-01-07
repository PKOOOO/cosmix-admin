"use client";
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
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
    longitude: initialLocation?.longitude || 24.9384, // Default to Helsinki
    latitude: initialLocation?.latitude || 60.1699,
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
      const isRNWebView = userAgent.includes('ReactNativeWebView');
      const isAndroidWebView = userAgent.includes('wv');
      const isIOSWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(userAgent);
      return isRNWebView || isAndroidWebView || isIOSWebView;
    };

    const detected = checkWebView();
    setIsWebView(detected);
  }, []);

  // Handle map load
  const handleMapLoad = useCallback(() => {
    console.log('Mapbox map loaded successfully');
  }, []);

  // Handle map error
  const handleMapError = useCallback((event: any) => {
    console.error('Mapbox map error:', event);
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
      })
      .catch(error => {
        console.error('Error reverse geocoding:', error);
      });
  }, [disabled, onLocationSelect, MAPBOX_TOKEN]);

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&limit=5&country=fi`
      );
      const data = await response.json();
      setSearchResults(data.features || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Haku epäonnistui');
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
    toast.success('Sijainti valittu!');
  }, [onLocationSelect]);

  // Handle Enter key in search
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="relative w-full h-[115vh] md:h-[calc(100vh-120px)] min-h-[500px]">
      {/* Full Screen Map */}
      <div className="absolute inset-0 overflow-hidden">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          onClick={handleMapClick}
          onLoad={handleMapLoad}
          onError={handleMapError}
          mapboxAccessToken={MAPBOX_TOKEN}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          cursor={disabled ? 'default' : 'crosshair'}
          attributionControl={false}
          preserveDrawingBuffer={isWebView}
          antialias={true}
          failIfMajorPerformanceCaveat={false}
          renderWorldCopies={true}
          touchZoomRotate={true}
        >
          {/* Selected Location Marker */}
          {selectedLocation && (
            <Marker
              longitude={selectedLocation.longitude}
              latitude={selectedLocation.latitude}
              anchor="bottom"
            >
              <div className="bg-[#423120] text-white p-3 rounded-full shadow-lg animate-bounce">
                <MapPin className="h-6 w-6" />
              </div>
            </Marker>
          )}
        </Map>
      </div>

      {/* Floating Search Bar - Styled like cosmix-v2 */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 w-[90%] max-w-md">
        <div className="relative">
          <div
            className="flex items-center bg-white rounded-full border-2 border-[#423120] px-4 py-3 shadow-lg"
            style={{
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
          >
            <Search className="h-6 w-6 text-[#423120] mr-3 flex-shrink-0" />
            <input
              type="text"
              placeholder="Etsi osoitetta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
              disabled={disabled}
              autoComplete="off"
              className="flex-1 text-lg font-medium text-[#423120] placeholder-[#423120]/50 bg-transparent outline-none"
              style={{ fontFamily: 'inherit' }}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchResults(false);
                }}
                className="ml-2 text-[#423120]/50 hover:text-[#423120]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 max-h-60 overflow-y-auto z-20">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleSearchResultSelect(result)}
                  className="w-full text-left px-4 py-3 hover:bg-[#F4EDE5] border-b border-gray-100 last:border-b-0 first:rounded-t-2xl last:rounded-b-2xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-[#423120] flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-[#423120]">{result.text}</div>
                      <div className="text-xs text-gray-500 line-clamp-1">{result.place_name}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Location Badge - Bottom */}
      {selectedLocation && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 w-[90%] max-w-md">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-[#D7C3A7]">
            <div className="flex items-center gap-3">
              <div className="bg-[#423120] text-white p-2 rounded-full">
                <Check className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#423120] truncate">{selectedLocation.address}</p>
                <p className="text-xs text-gray-500">
                  {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tap to select hint */}
      {/* {!selectedLocation && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-[#423120]/90 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
            Napauta karttaa valitaksesi sijainti
          </div>
        </div>
      )} */}
    </div>
  );
};
