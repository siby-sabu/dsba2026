/**
 * Main App Component
 * Agricultural Analytics Dashboard - Editorial Layout with State Panel
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import IndiaMap from './components/map/IndiaMap';
import ContentSection from './components/content/ContentSection';
import StateDialogEnhanced from './components/dialogs/StateDialogEnhanced';
import DistrictCard from './components/cards/DistrictCard';
import { api } from './api/client';
import './App.css';

function App() {
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [statePanelOpen, setStatePanelOpen] = useState(false);
  const [error, setError] = useState(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load states
      const statesData = await api.getStates();
      setStates(statesData.states || []);

      // Load all districts
      const districtsData = await api.getDistricts();
      setDistricts(districtsData.districts || []);

      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Make sure the API is running at http://localhost:8000');
      setLoading(false);
    }
  };

  const handleStateClick = (stateName) => {
    console.log('State clicked:', stateName);
    setSelectedState(stateName);
    setStatePanelOpen(true);
    setSelectedDistrict(null); // Clear any selected district
  };

  const handleDistrictClick = (district) => {
    console.log('District clicked:', district.district);
    setSelectedDistrict(district);
    // Keep state panel open so user can see both state context and district details
  };

  const handleCloseStatePanel = () => {
    setStatePanelOpen(false);
    setSelectedState(null);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          bgcolor: '#f8f7f4',
        }}
      >
        <CircularProgress sx={{ color: '#6b5d4f' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          p: 4,
          bgcolor: '#f8f7f4',
        }}
      >
        <Box sx={{ maxWidth: 600, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom sx={{ fontFamily: 'Playfair Display, serif' }}>
            Connection Error
          </Typography>
          <Typography>{error}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f8f7f4',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <Box
        component="header"
        sx={{
          py: 4,
          px: { xs: 3, md: 6 },
          borderBottom: '1px solid #e0ddd8',
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontFamily: 'Playfair Display, serif',
            fontWeight: 400,
            color: '#2c2418',
            letterSpacing: '-0.02em',
          }}
        >
          Agricultural Analytics
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: '#6b5d4f',
            mt: 0.5,
            fontSize: '0.875rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          India 2016–2023
        </Typography>
      </Box>

      {/* Main Grid Layout */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 0,
          minHeight: 'calc(100vh - 120px)',
        }}
      >
        {/* Left: Interactive Map */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            height: { xs: '60vh', lg: '100vh' },
            borderRight: { lg: '1px solid #e0ddd8' },
          }}
        >
          <IndiaMap
            districts={districts}
            onStateClick={handleStateClick}
            onDistrictClick={handleDistrictClick}
            selectedDistrict={selectedDistrict}
            selectedState={selectedState}
          />
        </Box>

        {/* Right: Content Sections */}
        <Box
          sx={{
            overflowY: 'auto',
            maxHeight: { lg: '100vh' },
          }}
        >
          <ContentSection
            states={states}
            districts={districts}
            selectedDistrict={selectedDistrict}
            onStateClick={handleStateClick}
          />
        </Box>
      </Box>

      {/* State Dialog (Enhanced with mini-map) */}
      {statePanelOpen && selectedState && (
        <StateDialogEnhanced
          open={statePanelOpen}
          onClose={handleCloseStatePanel}
          stateName={selectedState}
          onDistrictClick={handleDistrictClick}
        />
      )}

      {/* District Card (Modal) */}
      {selectedDistrict && (
        <DistrictCard
          district={selectedDistrict}
          open={!!selectedDistrict}
          onClose={() => setSelectedDistrict(null)}
        />
      )}
    </Box>
  );
}

export default App;
