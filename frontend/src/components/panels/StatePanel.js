/**
 * State Panel Component
 * Expandable panel showing state summary and districts (overlays the map)
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Grid,
  Card,
  CardContent,
  Collapse,
  Divider,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { api } from '../../api/client';

const StatePanel = ({ stateName, onClose, onDistrictClick }) => {
  const [stateInsights, setStateInsights] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (stateName) {
      loadStateData();
    }
  }, [stateName]);

  const loadStateData = async () => {
    try {
      setLoading(true);

      // Load state insights
      const insights = await api.getStateInsights(stateName);
      setStateInsights(insights);

      // Load districts in this state
      const districtsData = await api.getDistricts(stateName);
      setDistricts(districtsData.districts || []);

      setLoading(false);
    } catch (err) {
      console.error('Error loading state data:', err);
      setLoading(false);
    }
  };

  const handleDistrictClick = (district) => {
    onDistrictClick(district);
  };

  if (!stateName) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: { xs: '100%', md: '420px' },
        height: '100%',
        bgcolor: 'white',
        boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        transform: expanded ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 3,
          borderBottom: '1px solid #e0ddd8',
          bgcolor: '#f8f7f4',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="overline"
              sx={{
                color: '#6b5d4f',
                fontSize: '0.75rem',
                letterSpacing: '0.1em',
                fontWeight: 600,
              }}
            >
              State Overview
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontFamily: 'Playfair Display, serif',
                fontWeight: 400,
                color: '#2c2418',
                mt: 0.5,
              }}
            >
              {stateName}
            </Typography>
          </Box>
          <Box>
            <IconButton onClick={() => setExpanded(!expanded)} sx={{ color: '#6b5d4f', mr: 1 }}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <IconButton onClick={onClose} sx={{ color: '#6b5d4f' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Collapsible Content */}
      <Collapse in={expanded} timeout={300}>
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: '#6b5d4f' }} />
            </Box>
          ) : (
            <>
              {/* State Statistics */}
              {stateInsights && (
                <Box sx={{ mb: 4 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box>
                        <Typography
                          variant="h4"
                          sx={{
                            fontFamily: 'Playfair Display, serif',
                            fontSize: '2.5rem',
                            color: '#2c2418',
                            mb: 0.5,
                          }}
                        >
                          {stateInsights.num_districts || districts.length}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6b5d4f' }}>
                          Districts
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box>
                        <Typography
                          variant="h4"
                          sx={{
                            fontFamily: 'Playfair Display, serif',
                            fontSize: '2.5rem',
                            color: '#2c2418',
                            mb: 0.5,
                          }}
                        >
                          {stateInsights.total_crops || '—'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6b5d4f' }}>
                          Crop Types
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box>
                        <Typography
                          variant="h4"
                          sx={{
                            fontFamily: 'Playfair Display, serif',
                            fontSize: '2.5rem',
                            color: '#2c2418',
                            mb: 0.5,
                          }}
                        >
                          {stateInsights.avg_annual_rainfall
                            ? Math.round(stateInsights.avg_annual_rainfall)
                            : '—'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6b5d4f' }}>
                          Avg Rainfall (mm)
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box>
                        <Typography
                          variant="h4"
                          sx={{
                            fontFamily: 'Playfair Display, serif',
                            fontSize: '2.5rem',
                            color: '#2c2418',
                            mb: 0.5,
                          }}
                        >
                          {stateInsights.dominant_crops?.length || 0}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6b5d4f' }}>
                          Major Crops
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Dominant Crops */}
                  {stateInsights.dominant_crops && stateInsights.dominant_crops.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography
                        variant="overline"
                        sx={{
                          color: '#6b5d4f',
                          fontSize: '0.75rem',
                          letterSpacing: '0.1em',
                          fontWeight: 600,
                          mb: 1.5,
                          display: 'block',
                        }}
                      >
                        Dominant Crops
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {stateInsights.dominant_crops.map((crop, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              px: 2,
                              py: 0.75,
                              border: '1px solid #e0ddd8',
                              bgcolor: 'white',
                              fontSize: '0.875rem',
                              color: '#2c2418',
                            }}
                          >
                            {crop}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}

              <Divider sx={{ my: 3, borderColor: '#e0ddd8' }} />

              {/* Districts List */}
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: 'Playfair Display, serif',
                    fontWeight: 400,
                    color: '#2c2418',
                    mb: 2,
                  }}
                >
                  Districts ({districts.length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {districts.map((district) => (
                    <Card
                      key={district.district_id}
                      sx={{
                        bgcolor: 'transparent',
                        border: '1px solid #e0ddd8',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: '#6b5d4f',
                          transform: 'translateX(4px)',
                          bgcolor: '#f8f7f4',
                        },
                      }}
                      onClick={() => handleDistrictClick(district)}
                    >
                      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 500,
                              color: '#2c2418',
                            }}
                          >
                            {district.district}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#6b5d4f' }}>
                            View →
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default StatePanel;
