import { useState, useCallback, useRef } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export default function LocationPicker({ coordinates = [77.2090, 28.6139], onLocationChange }) {
  const [viewState, setViewState] = useState({
    longitude: coordinates[0],
    latitude: coordinates[1],
    zoom: 12,
  });
  const [marker, setMarker] = useState({
    longitude: coordinates[0],
    latitude: coordinates[1],
  });
  const [address, setAddress] = useState('');
  const timeoutRef = useRef(null);

  const reverseGeocode = useCallback(async (lng, lat) => {
    if (!MAPBOX_TOKEN) return;
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`
      );
      const data = await res.json();
      const place = data.features?.[0]?.place_name || '';
      setAddress(place);
      return place;
    } catch {
      return '';
    }
  }, []);

  const handleClick = useCallback(async (e) => {
    const { lng, lat } = e.lngLat;
    setMarker({ longitude: lng, latitude: lat });

    // Debounce reverse geocoding
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      const addr = await reverseGeocode(lng, lat);
      onLocationChange?.([lng, lat], addr || '');
    }, 300);
  }, [onLocationChange, reverseGeocode]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-yellow-600">Mapbox token not configured. Enter coordinates manually:</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            step="any"
            placeholder="Longitude"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            value={coordinates[0]}
            onChange={(e) => onLocationChange?.([parseFloat(e.target.value), coordinates[1]], '')}
          />
          <input
            type="number"
            step="any"
            placeholder="Latitude"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            value={coordinates[1]}
            onChange={(e) => onLocationChange?.([coordinates[0], parseFloat(e.target.value)], '')}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-lg overflow-hidden border border-gray-300" style={{ height: 300 }}>
        <Map
          {...viewState}
          onMove={(e) => setViewState(e.viewState)}
          onClick={handleClick}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="top-right" />
          <Marker
            longitude={marker.longitude}
            latitude={marker.latitude}
            draggable
            onDragEnd={(e) => {
              const { lng, lat } = e.lngLat;
              setMarker({ longitude: lng, latitude: lat });
              reverseGeocode(lng, lat).then((addr) => {
                onLocationChange?.([lng, lat], addr || '');
              });
            }}
            color="#dc2626"
          />
        </Map>
      </div>
      {address && <p className="text-sm text-gray-500 mt-1">{address}</p>}
      <p className="text-xs text-gray-400 mt-1">Click or drag the marker to set location</p>
    </div>
  );
}
