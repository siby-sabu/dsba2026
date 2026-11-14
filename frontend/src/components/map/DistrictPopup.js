/**
 * District Popup Component
 * Displays district insights in map popup
 */

import React, { useState, useEffect } from 'react';
import { CircularProgress } from '@mui/material';
import { api } from '../../api/client';

const DistrictPopup = ({ district }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadInsights();
  }, [district.district_id]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const data = await api.getDistrictInsights(district.district_id);
      setInsights(data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading insights:', err);
      setError('Failed to load insights');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="district-popup">
        <h3>{district.district}, {district.state}</h3>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <CircularProgress size={24} />
        </div>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="district-popup">
        <h3>{district.district}, {district.state}</h3>
        <p style={{ color: '#666' }}>No insights available</p>
      </div>
    );
  }

  const getWaterStressClass = (category) => {
    return `water-stress-badge water-stress-${category.toLowerCase()}`;
  };

  return (
    <div className="district-popup">
      <h3>{insights.district}, {insights.state}</h3>

      {/* Water Stress Badge */}
      {insights.water_stress_category && (
        <div style={{ marginBottom: '12px' }}>
          <span className={getWaterStressClass(insights.water_stress_category)}>
            {insights.water_stress_category.replace('_', ' ')}
          </span>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="info-grid">
        <div className="info-item">
          <span className="info-label">Rainfall</span>
          <span className="info-value">
            {insights.rainfall_stats?.avg_annual_precipitation.toFixed(0)} mm
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">NDVI</span>
          <span className="info-value">
            {insights.vegetation_stats?.avg_ndvi.toFixed(3)}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Veg Health</span>
          <span className="info-value">
            {insights.vegetation_stats?.vegetation_health}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Drought Prone</span>
          <span className="info-value">
            {insights.rainfall_stats?.drought_prone ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {/* Top Crops */}
      {insights.top_crops && insights.top_crops.length > 0 && (
        <div className="crops-list">
          <div className="info-label" style={{ marginBottom: '4px' }}>
            Top Crops
          </div>
          {insights.top_crops.map((crop, idx) => (
            <div key={idx} className="crop-item">
              <span>{crop.crop}</span>
              <span style={{ color: '#2e7d32', fontWeight: 600 }}>
                {crop.avg_yield.toFixed(2)} t/ha
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Metadata */}
      {insights.metadata && (
        <div style={{ marginTop: '12px', fontSize: '11px', color: '#999' }}>
          Data: {insights.metadata.total_records} records
          {insights.metadata.data_years && ` | ${insights.metadata.data_years[0]}-${insights.metadata.data_years[insights.metadata.data_years.length - 1]}`}
        </div>
      )}
    </div>
  );
};

export default DistrictPopup;
