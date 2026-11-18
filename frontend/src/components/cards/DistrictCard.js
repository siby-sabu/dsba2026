/**
 * District Card Component
 * Detailed card showing district insights
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Grid,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { api } from '../../api/client';

const DistrictCard = ({ district, open, onClose }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && district) {
      loadInsights();
    }
  }, [open, district]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const data = await api.getDistrictInsights(district.district_id);
      setInsights(data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading insights:', err);
      setLoading(false);
    }
  };

  const getWaterStressColor = (category) => {
    const colors = {
      drought: '#c62828',
      normal: '#2e7d32',
      irrigated: '#1565c0',
      pest_disease: '#e65100',
    };
    return colors[category?.toLowerCase()] || '#6b5d4f';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#f8f7f4',
          borderRadius: 0,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          p: 4,
          borderBottom: '1px solid #e0ddd8',
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h4"
            sx={{
              fontFamily: 'Playfair Display, serif',
              fontWeight: 400,
              color: '#2c2418',
              mb: 0.5,
            }}
          >
            {district.district}
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
            {district.state}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#6b5d4f' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#6b5d4f' }} />
          </Box>
        ) : insights ? (
          <>
            {/* Water Stress Badge */}
            {insights.water_stress_category && (
              <Box sx={{ mb: 4 }}>
                <Chip
                  label={insights.water_stress_category.replace('_', ' ').toUpperCase()}
                  sx={{
                    bgcolor: getWaterStressColor(insights.water_stress_category),
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    letterSpacing: '0.05em',
                  }}
                />
              </Box>
            )}

            {/* Key Metrics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={6}>
                <Box>
                  <Typography
                    variant="h4"
                    sx={{
                      fontFamily: 'Playfair Display, serif',
                      fontSize: '2rem',
                      color: '#2c2418',
                      mb: 0.5,
                    }}
                  >
                    {insights.rainfall_stats?.avg_annual_precipitation.toFixed(0) || '—'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b5d4f' }}>
                    Avg Annual Rainfall (mm)
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography
                    variant="h4"
                    sx={{
                      fontFamily: 'Playfair Display, serif',
                      fontSize: '2rem',
                      color: '#2c2418',
                      mb: 0.5,
                    }}
                  >
                    {insights.vegetation_stats?.avg_ndvi.toFixed(3) || '—'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b5d4f' }}>
                    NDVI Score
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Vegetation Health */}
            {insights.vegetation_stats?.vegetation_health && (
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="overline"
                  sx={{
                    color: '#6b5d4f',
                    fontSize: '0.75rem',
                    letterSpacing: '0.1em',
                    fontWeight: 600,
                    mb: 1,
                    display: 'block',
                  }}
                >
                  Vegetation health
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: '#2c2418',
                    textTransform: 'capitalize',
                    fontSize: '1.125rem',
                  }}
                >
                  {insights.vegetation_stats.vegetation_health}
                </Typography>
              </Box>
            )}

            {/* Drought Status */}
            {insights.rainfall_stats?.drought_prone !== undefined && (
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="overline"
                  sx={{
                    color: '#6b5d4f',
                    fontSize: '0.75rem',
                    letterSpacing: '0.1em',
                    fontWeight: 600,
                    mb: 1,
                    display: 'block',
                  }}
                >
                  Drought prone
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: '#2c2418',
                    fontSize: '1.125rem',
                  }}
                >
                  {insights.rainfall_stats.drought_prone ? 'Yes' : 'No'}
                </Typography>
              </Box>
            )}

            <Divider sx={{ my: 4, borderColor: '#e0ddd8' }} />

            {/* Top Crops */}
            {insights.top_crops && insights.top_crops.length > 0 && (
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: 'Playfair Display, serif',
                    fontWeight: 400,
                    color: '#2c2418',
                    mb: 3,
                  }}
                >
                  Top Crops
                </Typography>
                {insights.top_crops.map((crop, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      py: 2,
                      borderBottom: idx < insights.top_crops.length - 1 ? '1px solid #e0ddd8' : 'none',
                    }}
                  >
                    <Typography
                      variant="body1"
                      sx={{
                        color: '#2c2418',
                        fontWeight: 500,
                      }}
                    >
                      {crop.crop}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: '#6b5d4f',
                        fontFamily: 'monospace',
                      }}
                    >
                      {crop.avg_yield.toFixed(2)} t/ha
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {/* Metadata */}
            {insights.metadata && (
              <Box
                sx={{
                  mt: 4,
                  pt: 3,
                  borderTop: '1px solid #e0ddd8',
                }}
              >
                <Typography variant="caption" sx={{ color: '#999' }}>
                  Data: {insights.metadata.total_records} records
                  {insights.metadata.data_years &&
                    ` | ${insights.metadata.data_years[0]}–${
                      insights.metadata.data_years[insights.metadata.data_years.length - 1]
                    }`}
                </Typography>
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" sx={{ color: '#6b5d4f' }}>
              No insights available for this district
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DistrictCard;
