// src/components/VendorMap.tsx
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, AlertCircle } from 'lucide-react';

type VendorMapProps = {
  initialLongitude: number;
  initialLatitude: number;
  onGeolocationChange: (longitude: number, latitude: number) => void;
};

const VendorMap: React.FC<VendorMapProps> = ({ 
  initialLongitude, 
  initialLatitude, 
  onGeolocationChange 
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    // Check if access token is available
    const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    
    if (!accessToken) {
      setMapError('Mapbox access token is not configured');
      setIsLoading(false);
      return;
    }

    mapboxgl.accessToken = accessToken;

    try {
      // Initialize the map
      map.current = new mapboxgl.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [initialLongitude, initialLatitude],
        zoom: 15,
        attributionControl: false,
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Handle map load
      map.current.on('load', () => {
        setIsLoading(false);
        
        // Create draggable marker
        if (marker.current) {
          marker.current.remove();
        }

        marker.current = new mapboxgl.Marker({ 
          draggable: true,
          color: '#3B82F6' // Blue color to match the theme
        })
          .setLngLat([initialLongitude, initialLatitude])
          .addTo(map.current!);

        // Handle marker drag
        marker.current.on('dragend', () => {
          const lngLat = marker.current!.getLngLat();
          onGeolocationChange(lngLat.lng, lngLat.lat);
        });
      });

      // Handle map errors
      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setMapError('Failed to load map');
        setIsLoading(false);
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Failed to initialize map');
      setIsLoading(false);
    }

    // Cleanup function
    return () => {
      if (marker.current) {
        marker.current.remove();
      }
      if (map.current) {
        map.current.remove();
      }
    };
  }, []); // Remove dependencies to prevent re-initialization

  // Update marker position when coordinates change
  useEffect(() => {
    if (marker.current && map.current) {
      marker.current.setLngLat([initialLongitude, initialLatitude]);
      map.current.setCenter([initialLongitude, initialLatitude]);
    }
  }, [initialLongitude, initialLatitude]);

  // Error state
  if (mapError) {
    return (
      <div className="w-full h-64 bg-red-50 rounded-xl border-2 border-red-200 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 text-sm font-medium">Map Error</p>
          <p className="text-red-600 text-xs mt-1">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-64 rounded-xl overflow-hidden border border-gray-200">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map container */}
      <div 
        ref={mapContainer} 
        className="w-full h-full"
        style={{ 
          width: '100%', 
          height: '100%',
          minHeight: '256px' // Ensure minimum height
        }} 
      />

      {/* Coordinates display */}
      <div className="absolute bottom-2 right-2 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg px-3 py-1 text-xs text-gray-600 border">
        <MapPin className="w-3 h-3 inline mr-1" />
        {initialLatitude.toFixed(4)}, {initialLongitude.toFixed(4)}
      </div>
    </div>
  );
};

export default VendorMap;