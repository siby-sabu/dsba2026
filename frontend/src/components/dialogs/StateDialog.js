/**
 * State Dialog Component
 * Modal showing state-level insights and district list
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { api } from '../../api/client';

const StateDialog = ({ open, onClose, stateName, onDistrictClick }) => {
  const [stateInsights, setStateInsights] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);

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
      setDistricts(districtsData.districts || []);

      setLoading(false);
    } catch (err) {
      console.error('Error loading state data:', err);
      setLoading(false);
    }
  };

  const handleDistrictClick = (district) => {
    onDistrictClick(district);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#f8f7f4',
          borderRadius: 0,
          maxHeight: '90vh',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 4,
          borderBottom: '1px solid #e0ddd8',
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
            State overview
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
        ) : (
          <>
            {/* State Statistics */}
            {stateInsights && (
              <Box sx={{ mb: 6 }}>
                <Grid container spacing={3}>
                  <Grid item xs={6} md={3}>
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
                  <Grid item xs={6} md={3}>
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
                  <Grid item xs={6} md={3}>
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
                  <Grid item xs={6} md={3}>
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
                  <Box sx={{ mt: 4 }}>
                    <Typography
                      variant="overline"
                      sx={{
                        color: '#6b5d4f',
                        fontSize: '0.75rem',
                        letterSpacing: '0.1em',
                        fontWeight: 600,
                        mb: 2,
                        display: 'block',
                      }}
                    >
                      Dominant crops
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {stateInsights.dominant_crops.map((crop, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            px: 2,
                            py: 1,
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

            <Divider sx={{ my: 4, borderColor: '#e0ddd8' }} />

            {/* Districts Grid */}
            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontFamily: 'Playfair Display, serif',
                  fontWeight: 400,
                  color: '#2c2418',
                  mb: 3,
                }}
              >
                Districts
              </Typography>
              <Grid container spacing={2}>
                {districts.map((district) => (
                  <Grid item xs={12} sm={6} md={4} key={district.district_id}>
                    <Card
                      sx={{
                        bgcolor: 'white',
                        border: '1px solid #e0ddd8',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: '#6b5d4f',
                          transform: 'translateY(-2px)',
                        },
                      }}
                      onClick={() => handleDistrictClick(district)}
                    >
                      <CardContent>
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 500,
                            color: '#2c2418',
                            mb: 0.5,
                          }}
                        >
                          {district.district}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#6b5d4f' }}>
                          View details →
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StateDialog;
