/**
 * India Map Component
 * Interactive Leaflet map with REAL clickable state boundaries from GeoJSON
 */

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, GeoJSON } from 'react-leaflet';
import { api } from '../../api/client';
import 'leaflet/dist/leaflet.css';

const IndiaMap = ({ districts, onStateClick, onDistrictClick, selectedDistrict, selectedState }) => {
  const [hoveredDistrict, setHoveredDistrict] = useState(null);
  const [hoveredState, setHoveredState] = useState(null);
  const [stateGeoJSON, setStateGeoJSON] = useState(null);

  // India center coordinates
  const center = [22.5937, 78.9629];
  const zoom = 5;

  // Load state boundaries from API
  useEffect(() => {
    const loadBoundaries = async () => {
      try {
        const data = await api.getStateBoundaries();
        console.log('✅ Loaded state boundaries:', data.features.length, 'states');
        console.log('📊 Simplified boundaries with',
          data.features.reduce((sum, f) => {
            const coords = f.geometry.coordinates;
            return sum + (f.geometry.type === 'Polygon' ? coords[0].length : coords.flat().length);
          }, 0),
          'total points');
        setStateGeoJSON(data);
      } catch (error) {
        console.error('❌ Error loading state boundaries:', error);
      }
    };
    loadBoundaries();
  }, []);

  const getMarkerColor = (district) => {
    if (selectedDistrict && district.district_id === selectedDistrict.district_id) {
      return '#6b5d4f';
    }
    if (hoveredDistrict && district.district_id === hoveredDistrict.district_id) {
      return '#2c2418';
    }
    if (selectedState && district.state === selectedState) {
      return '#8b7355';
    }
    return '#a89984';
  };

  const getMarkerRadius = (district) => {
    if (selectedDistrict && district.district_id === selectedDistrict.district_id) {
      return 8;
    }
    if (hoveredDistrict && district.district_id === hoveredDistrict.district_id) {
      return 7;
    }
    if (selectedState && district.state === selectedState) {
      return 6;
    }
    return 5;
  };

  const handleMarkerClick = (district) => {
    console.log('Marker clicked:', district.district, 'in', district.state);

    // If this state is not selected, select the state first
    if (!selectedState || selectedState !== district.state) {
      console.log('Opening state panel for:', district.state);
      onStateClick(district.state);
    } else {
      // State already selected, show district details
      console.log('Opening district details for:', district.district);
      onDistrictClick(district);
    }
  };

  // Style function for state boundaries
  const stateStyle = (feature) => {
    const stateName = feature.properties.name;
    const isSelected = selectedState === stateName;
    const isHovered = hoveredState === stateName;

    return {
      fillColor: isSelected ? '#6b5d4f' : isHovered ? '#a89984' : '#e0ddd8',
      fillOpacity: isSelected ? 0.25 : isHovered ? 0.15 : 0.08,
      color: isSelected ? '#6b5d4f' : '#d0ccc7',
      weight: isSelected ? 2.5 : 1.5,
      opacity: 0.6,
    };
  };

  // Event handlers for state boundaries
  const onEachState = (feature, layer) => {
    const stateName = feature.properties.name;

    layer.on({
      click: (e) => {
        console.log('State boundary clicked:', stateName);
        onStateClick(stateName);
      },
      mouseover: (e) => {
        setHoveredState(stateName);
        layer.setStyle({
          fillOpacity: 0.2,
          weight: 2,
        });
      },
      mouseout: (e) => {
        setHoveredState(null);
        layer.setStyle(stateStyle(feature));
      },
    });

    // Bind tooltip
    layer.bindTooltip(
      `<div style="font-family: Inter, sans-serif; padding: 4px;">
        <div style="font-weight: 600; color: #2c2418; margin-bottom: 2px;">${stateName}</div>
        <div style="font-size: 11px; color: #6b5d4f;">Click to explore →</div>
      </div>`,
      {
        direction: 'center',
        permanent: false,
        className: 'state-tooltip-popup',
      }
    );
  };

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={4}
      maxZoom={8}
      style={{ width: '100%', height: '100%', background: '#f8f7f4' }}
      scrollWheelZoom={true}
      zoomControl={true}
    >
      {/* Muted map tiles */}
      <TileLayer
        attribution='Map tiles by <a href="http://stamen.com">Stamen Design</a>'
        url="https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png"
        opacity={0.5}
      />

      {/* State boundaries from GeoJSON - BELOW markers */}
      {stateGeoJSON && (
        <GeoJSON
          key={selectedState} // Re-render when selection changes
          data={stateGeoJSON}
          style={stateStyle}
          onEachFeature={onEachState}
        />
      )}

      {/* District markers - ON TOP - Only show when state is selected */}
      {selectedState && districts
        .filter((district) => district.state === selectedState)
        .map((district) => {
          if (!district.centroid_lat || !district.centroid_lon) {
            return null;
          }

          return (
            <CircleMarker
              key={`district-${district.district_id}`}
              center={[district.centroid_lat, district.centroid_lon]}
              radius={getMarkerRadius(district)}
              fillColor={getMarkerColor(district)}
              color="#f8f7f4"
              weight={1.5}
              opacity={0.9}
              fillOpacity={0.8}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent.stopPropagation();
                  handleMarkerClick(district);
                },
                mouseover: () => setHoveredDistrict(district),
                mouseout: () => setHoveredDistrict(null),
              }}
            >
              <Tooltip direction="top" offset={[0, -5]} opacity={0.9}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px' }}>
                  <div style={{ fontWeight: 600, color: '#2c2418' }}>
                    {district.district}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b5d4f' }}>
                    {district.state}
                  </div>
                  <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>
                    Click for details
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
    </MapContainer>
  );
};

export default IndiaMap;
