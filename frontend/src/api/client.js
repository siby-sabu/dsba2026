/**
 * API Client
 * Axios HTTP client for FastAPI backend
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
client.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const api = {
  // Get all states
  getStates: async () => {
    const response = await client.get('/states');
    return response.data;
  },

  // Get districts (optionally filtered by state)
  getDistricts: async (state = null) => {
    const params = state ? { state } : {};
    const response = await client.get('/districts', { params });
    return response.data;
  },

  // Get specific district by ID
  getDistrictById: async (districtId) => {
    const response = await client.get(`/districts/${districtId}`);
    return response.data;
  },

  // Get district insights
  getDistrictInsights: async (districtId) => {
    const response = await client.get(`/insights/district/${districtId}`);
    return response.data;
  },

  // Get state insights
  getStateInsights: async (state) => {
    const response = await client.get(`/insights/state/${state}`);
    return response.data;
  },

  // Get crop insights
  getCropInsights: async (cropName) => {
    const response = await client.get(`/insights/crop/${cropName}`);
    return response.data;
  },

  // Get state boundaries (simplified GeoJSON)
  getStateBoundaries: async () => {
    const response = await client.get(`/geographic/state-boundaries`);
    return response.data;
  },
};

export default client;
