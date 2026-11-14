/**
 * Filter Panel Component
 * Sidebar with filters for states and districts
 */

import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Chip,
} from '@mui/material';

const FilterPanel = ({
  states,
  selectedState,
  onStateChange,
  districts,
  selectedDistrict,
  onDistrictChange,
}) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 600 }}>
        Filters
      </Typography>

      <Divider sx={{ mb: 2 }} />

      {/* State Selector */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>State</InputLabel>
        <Select
          value={selectedState || ''}
          label="State"
          onChange={(e) => onStateChange(e.target.value || null)}
        >
          <MenuItem value="">
            <em>All States</em>
          </MenuItem>
          {states.map((state) => (
            <MenuItem key={state} value={state}>
              {state}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Stats */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Overview
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip
            label={`${districts.length} Districts`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`${states.length} States`}
            size="small"
            color="success"
            variant="outlined"
          />
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Selected District Info */}
      {selectedDistrict && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Selected District
          </Typography>
          <Box
            sx={{
              p: 2,
              bgcolor: '#e8f5e9',
              borderRadius: 1,
              border: '1px solid #4caf50',
            }}
          >
            <Typography variant="body1" fontWeight={600}>
              {selectedDistrict.district}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedDistrict.state}
            </Typography>
            {selectedDistrict.centroid_lat && selectedDistrict.centroid_lon && (
              <Typography variant="caption" color="text.secondary">
                📍 {selectedDistrict.centroid_lat.toFixed(4)}, {selectedDistrict.centroid_lon.toFixed(4)}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* Legend */}
      <Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Map Legend
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                bgcolor: '#4caf50',
                border: '2px solid #fff',
              }}
            />
            <Typography variant="caption">District Marker</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                bgcolor: '#1976d2',
                border: '2px solid #fff',
              }}
            />
            <Typography variant="caption">Selected District</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                bgcolor: '#ff9800',
                border: '2px solid #fff',
              }}
            />
            <Typography variant="caption">Hover</Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Info */}
      <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          <strong>Tip:</strong> Click on any district marker to view detailed insights including
          rainfall, vegetation health, and top crops.
        </Typography>
      </Box>
    </Box>
  );
};

export default FilterPanel;
