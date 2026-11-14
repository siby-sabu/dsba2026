/**
 * Enhanced State Dialog Component
 * Shows state boundary mini-map on left, metrics on right
 * Positioned to the right side of the state
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Grid,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip } from 'react-leaflet';
import { api } from '../../api/client';
import 'leaflet/dist/leaflet.css';

const StateDialogEnhanced = ({ open, onClose, stateName, onDistrictClick }) => {
  const [stateInsights, setStateInsights] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [stateBoundary, setStateBoundary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
  const [mapZoom, setMapZoom] = useState(6);

  useEffect(() => {
    if (open && stateName) {
      loadStateData();
    }
  }, [open, stateName]);

  const loadStateData = async () => {
    try {
      setLoading(true);

      // Load state insights
      const insights = await api.getStateInsights(stateName);
      setStateInsights(insights);

      // Load districts in this state
      const districtsData = await api.getDistricts(stateName);
      const stateDistricts = districtsData.districts || [];
      setDistricts(stateDistricts);

      // Load state boundary
      const boundaries = await api.getStateBoundaries();
      const stateBoundaryFeature = boundaries.features.find(
        (f) => f.properties.name === stateName
      );

      if (stateBoundaryFeature) {
        setStateBoundary({
          type: 'FeatureCollection',
          features: [stateBoundaryFeature],
        });

        // Calculate center from districts
        if (stateDistricts.length > 0) {
          const avgLat =
            stateDistricts.reduce((sum, d) => sum + (d.centroid_lat || 0), 0) /
            stateDistricts.length;
          const avgLon =
            stateDistricts.reduce((sum, d) => sum + (d.centroid_lon || 0), 0) /
            stateDistricts.length;
          setMapCenter([avgLat, avgLon]);
          setMapZoom(7);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading state data:', err);
      setLoading(false);
    }
  };

  const handleDistrictClick = (district) => {
    console.log('District clicked in state view:', district.district);
    onDistrictClick(district);
  };

  const stateBoundaryStyle = {
    fillColor: '#6b5d4f',
    fillOpacity: 0.1,
    color: '#6b5d4f',
    weight: 2,
    opacity: 0.8,
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'white',
          borderRadius: 0,
          maxHeight: '85vh',
          height: '700px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        },
      }}
      sx={{
        '& .MuiBackdrop-root': {
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 4,
          py: 2.5,
          borderBottom: '1px solid #e0ddd8',
          bgcolor: '#f8f7f4',
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontFamily: 'Playfair Display, serif',
              fontWeight: 400,
              color: '#2c2418',
              mb: 0.5,
            }}
          >
            {stateName}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#6b5d4f',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '0.75rem',
            }}
          >
            State Overview
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#6b5d4f' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0, height: 'calc(100% - 80px)' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress sx={{ color: '#6b5d4f' }} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', height: '100%' }}>
            {/* Left: State Map with Districts */}
            <Box
              sx={{
                flex: '0 0 50%',
                bgcolor: '#f8f7f4',
                borderRight: '1px solid #e0ddd8',
                position: 'relative',
              }}
            >
              <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, bgcolor: 'white', px: 2, py: 1, boxShadow: 1 }}>
                <Typography variant="caption" sx={{ color: '#6b5d4f', fontWeight: 600 }}>
                  {districts.length} Districts
                </Typography>
              </Box>

              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ width: '100%', height: '100%', background: '#f8f7f4' }}
                zoomControl={true}
                scrollWheelZoom={true}
                doubleClickZoom={true}
              >
                <TileLayer
                  url="https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png"
                  opacity={0.4}
                />

                {/* State Boundary */}
                {stateBoundary && (
                  <GeoJSON
                    data={stateBoundary}
                    style={stateBoundaryStyle}
                  />
                )}

                {/* District Markers */}
                {districts.map((district) => {
                  if (!district.centroid_lat || !district.centroid_lon) {
                    return null;
                  }

                  return (
                    <CircleMarker
                      key={district.district_id}
                      center={[district.centroid_lat, district.centroid_lon]}
                      radius={6}
                      fillColor="#6b5d4f"
                      color="white"
                      weight={2}
                      opacity={1}
                      fillOpacity={0.8}
                      eventHandlers={{
                        click: (e) => {
                          e.originalEvent.stopPropagation();
                          handleDistrictClick(district);
                        },
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -5]} opacity={0.95}>
                        <Box sx={{ fontFamily: 'Inter, sans-serif', fontSize: '12px' }}>
                          <Box sx={{ fontWeight: 600, color: '#2c2418' }}>
                            {district.district}
                          </Box>
                          <Box sx={{ fontSize: '10px', color: '#6b5d4f', mt: 0.5 }}>
                            Click for details
                          </Box>
                        </Box>
                      </Tooltip>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </Box>

            {/* Right: State Metrics & Summary */}
            <Box
              sx={{
                flex: '0 0 50%',
                overflowY: 'auto',
                p: 4,
              }}
            >
              {/* State Statistics */}
              {stateInsights && (
                <>
                  <Box sx={{ mb: 4 }}>
                    <Typography
                      variant="overline"
                      sx={{
                        color: '#6b5d4f',
                        fontSize: '0.7rem',
                        letterSpacing: '0.12em',
                        fontWeight: 600,
                        mb: 2,
                        display: 'block',
                      }}
                    >
                      Key Metrics
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={6}>
                        <Box>
                          <Typography
                            variant="h3"
                            sx={{
                              fontFamily: 'Playfair Display, serif',
                              fontSize: '3rem',
                              color: '#2c2418',
                              mb: 0.5,
                              lineHeight: 1,
                            }}
                          >
                            {stateInsights.num_districts || districts.length}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6b5d4f', fontSize: '0.875rem' }}>
                            Districts
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box>
                          <Typography
                            variant="h3"
                            sx={{
                              fontFamily: 'Playfair Display, serif',
                              fontSize: '3rem',
                              color: '#2c2418',
                              mb: 0.5,
                              lineHeight: 1,
                            }}
                          >
                            {stateInsights.total_crops || '—'}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6b5d4f', fontSize: '0.875rem' }}>
                            Crop Types
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box>
                          <Typography
                            variant="h3"
                            sx={{
                              fontFamily: 'Playfair Display, serif',
                              fontSize: '3rem',
                              color: '#2c2418',
                              mb: 0.5,
                              lineHeight: 1,
                            }}
                          >
                            {stateInsights.avg_annual_rainfall
                              ? Math.round(stateInsights.avg_annual_rainfall)
                              : '—'}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6b5d4f', fontSize: '0.875rem' }}>
                            Avg Rainfall (mm)
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box>
                          <Typography
                            variant="h3"
                            sx={{
                              fontFamily: 'Playfair Display, serif',
                              fontSize: '3rem',
                              color: '#2c2418',
                              mb: 0.5,
                              lineHeight: 1,
                            }}
                          >
                            {stateInsights.dominant_crops?.length || 0}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6b5d4f', fontSize: '0.875rem' }}>
                            Major Crops
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>

                  <Divider sx={{ my: 3, borderColor: '#e0ddd8' }} />

                  {/* Dominant Crops */}
                  {stateInsights.dominant_crops && stateInsights.dominant_crops.length > 0 && (
                    <Box sx={{ mb: 4 }}>
                      <Typography
                        variant="overline"
                        sx={{
                          color: '#6b5d4f',
                          fontSize: '0.7rem',
                          letterSpacing: '0.12em',
                          fontWeight: 600,
                          mb: 2,
                          display: 'block',
                        }}
                      >
                        Dominant Crops
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {stateInsights.dominant_crops.map((crop, idx) => (
                          <Chip
                            key={idx}
                            label={crop}
                            sx={{
                              bgcolor: 'white',
                              border: '1px solid #e0ddd8',
                              color: '#2c2418',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              '&:hover': {
                                borderColor: '#6b5d4f',
                                bgcolor: '#f8f7f4',
                              },
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  <Divider sx={{ my: 3, borderColor: '#e0ddd8' }} />

                  {/* High/Low Performing Districts */}
                  {(stateInsights.high_performing_districts?.length > 0 ||
                    stateInsights.underperforming_districts?.length > 0) && (
                    <Box sx={{ mb: 3 }}>
                      {stateInsights.high_performing_districts?.length > 0 && (
                        <Box sx={{ mb: 3 }}>
                          <Typography
                            variant="overline"
                            sx={{
                              color: '#6b5d4f',
                              fontSize: '0.7rem',
                              letterSpacing: '0.12em',
                              fontWeight: 600,
                              mb: 1.5,
                              display: 'block',
                            }}
                          >
                            High Performing Districts
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {stateInsights.high_performing_districts.map((district, idx) => (
                              <Chip
                                key={idx}
                                label={district}
                                size="small"
                                sx={{
                                  bgcolor: '#e8f5e9',
                                  color: '#2e7d32',
                                  fontSize: '0.75rem',
                                  border: '1px solid #c8e6c9',
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}

                      {stateInsights.underperforming_districts?.length > 0 && (
                        <Box>
                          <Typography
                            variant="overline"
                            sx={{
                              color: '#6b5d4f',
                              fontSize: '0.7rem',
                              letterSpacing: '0.12em',
                              fontWeight: 600,
                              mb: 1.5,
                              display: 'block',
                            }}
                          >
                            Underperforming Districts
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {stateInsights.underperforming_districts.map((district, idx) => (
                              <Chip
                                key={idx}
                                label={district}
                                size="small"
                                sx={{
                                  bgcolor: '#fff3e0',
                                  color: '#e65100',
                                  fontSize: '0.75rem',
                                  border: '1px solid #ffe0b2',
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  )}

                  <Divider sx={{ my: 3, borderColor: '#e0ddd8' }} />

                  {/* Instructions */}
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: '#f8f7f4',
                      border: '1px solid #e0ddd8',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#6b5d4f',
                        fontSize: '0.75rem',
                        display: 'block',
                        mb: 0.5,
                        fontWeight: 600,
                      }}
                    >
                      💡 How to explore
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6b5d4f', fontSize: '0.75rem' }}>
                      Click on any district marker on the map to view detailed insights including rainfall,
                      vegetation health, and top crops for that district.
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StateDialogEnhanced;
