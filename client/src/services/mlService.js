// ML Service using your existing API client
import api, { getMLHealth, getMLRankings } from './api';

export const mlService = {
  // Check ML service health
  async checkHealth() {
    try {
      const response = await getMLHealth();
      return response.data;
    } catch (error) {
      console.error('ML Health check failed:', error);
      return { status: 'unavailable', model_loaded: false };
    }
  },

  // Get ML rankings for a specific request
  async getMLRankings(requestId) {
    try {
      const response = await getMLRankings(requestId);
      return response.data;
    } catch (error) {
      console.error('Failed to get ML rankings:', error);
      return null;
    }
  }
};