/**
 * Content Section Component
 * Editorial-style content sections for the right panel
 */

import React from 'react';
import { Box, Typography, Grid, Card, CardContent } from '@mui/material';

const ContentSection = ({ states, districts, selectedDistrict, onStateClick }) => {
  const totalCrops = 62;
  const yearRange = '2016–2023';

  return (
    <Box sx={{ p: { xs: 3, md: 6 } }}>
      {/* Hero Section */}
      <Box sx={{ mb: 8 }}>
        <Typography
          variant="h2"
          sx={{
            fontFamily: 'Playfair Display, serif',
            fontWeight: 400,
            fontSize: { xs: '2.5rem', md: '3.5rem' },
            lineHeight: 1.2,
            color: '#2c2418',
            mb: 3,
            letterSpacing: '-0.02em',
          }}
        >
          An agricultural story
          <br />
          of India
        </Typography>
        <Typography
          variant="body1"
          sx={{
            maxWidth: '540px',
            lineHeight: 1.8,
            color: '#6b5d4f',
            fontSize: '1.05rem',
          }}
        >
          In partnership with data from across {states.length} states, we explore a decade
          of crop yields, rainfall patterns, and vegetation health. Each district tells a
          story of resilience and adaptation to changing climate conditions.
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Box sx={{ mb: 8 }}>
        <Typography
          variant="overline"
          sx={{
            color: '#6b5d4f',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            fontWeight: 600,
            mb: 3,
            display: 'block',
          }}
        >
          By the numbers
        </Typography>
        <Grid container spacing={4}>
          <Grid item xs={6} md={3}>
            <Box>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '3rem',
                  color: '#2c2418',
                  mb: 0.5,
                }}
              >
                {districts.length}
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b5d4f' }}>
                Districts
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '3rem',
                  color: '#2c2418',
                  mb: 0.5,
                }}
              >
                {states.length}
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b5d4f' }}>
                States
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '3rem',
                  color: '#2c2418',
                  mb: 0.5,
                }}
              >
                {totalCrops}
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b5d4f' }}>
                Crop Types
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '3rem',
                  color: '#2c2418',
                  mb: 0.5,
                }}
              >
                8
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b5d4f' }}>
                Years
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Explore Section */}
      <Box sx={{ mb: 8 }}>
        <Typography
          variant="h4"
          sx={{
            fontFamily: 'Playfair Display, serif',
            fontWeight: 400,
            fontSize: '2rem',
            color: '#2c2418',
            mb: 3,
          }}
        >
          Explore by region
        </Typography>
        <Typography
          variant="body1"
          sx={{
            maxWidth: '540px',
            lineHeight: 1.8,
            color: '#6b5d4f',
            mb: 4,
          }}
        >
          Click on any state in the map to discover rainfall trends, vegetation health,
          and crop performance at both state and district levels.
        </Typography>

        {/* Featured States Grid */}
        <Grid container spacing={2}>
          {states.slice(0, 6).map((state) => (
            <Grid item xs={12} sm={6} md={4} key={state}>
              <Card
                sx={{
                  bgcolor: 'transparent',
                  border: '1px solid #e0ddd8',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: '#6b5d4f',
                    transform: 'translateY(-2px)',
                  },
                }}
                onClick={() => onStateClick(state)}
              >
                <CardContent>
                  <Typography
                    variant="h6"
                    sx={{
                      fontFamily: 'Playfair Display, serif',
                      fontWeight: 400,
                      color: '#2c2418',
                      mb: 1,
                    }}
                  >
                    {state}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b5d4f' }}>
                    View insights →
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Selected District Section */}
      {selectedDistrict && (
        <Box
          sx={{
            p: 4,
            bgcolor: '#f0ede8',
            border: '1px solid #e0ddd8',
            mb: 8,
          }}
        >
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
            Currently viewing
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontFamily: 'Playfair Display, serif',
              fontWeight: 400,
              color: '#2c2418',
              mb: 0.5,
            }}
          >
            {selectedDistrict.district}
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b5d4f' }}>
            {selectedDistrict.state}
          </Typography>
        </Box>
      )}

      {/* About Section */}
      <Box>
        <Typography
          variant="h4"
          sx={{
            fontFamily: 'Playfair Display, serif',
            fontWeight: 400,
            fontSize: '2rem',
            color: '#2c2418',
            mb: 3,
          }}
        >
          Data insights
        </Typography>
        <Typography
          variant="body1"
          sx={{
            maxWidth: '540px',
            lineHeight: 1.8,
            color: '#6b5d4f',
            mb: 2,
          }}
        >
          This platform combines crop yield data with precipitation and vegetation indices
          to identify patterns and regional variations. The analysis covers {yearRange},
          focusing on three growing seasons: Kharif, Rabi, and Zaid.
        </Typography>
        <Typography
          variant="body1"
          sx={{
            maxWidth: '540px',
            lineHeight: 1.8,
            color: '#6b5d4f',
          }}
        >
          Water stress classifications help identify drought-prone regions and areas with
          optimal irrigation. NDVI (vegetation health) correlates with rainfall patterns,
          revealing the impact of climate on agricultural productivity.
        </Typography>
      </Box>
    </Box>
  );
};

export default ContentSection;
