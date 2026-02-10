import api from '@/lib/api';

export const dashboardService = {
  getDashboardData: async () => {
    const response = await api.get('/dashboard');
    return response.data;
  },

  getKPIs: async () => {
    const response = await api.get('/dashboard/kpis');
    return response.data;
  },

  getAssetTurnover: async () => {
    const response = await api.get('/dashboard/charts/turnover');
    return response.data;
  },

  getAssetDistribution: async () => {
    const response = await api.get('/dashboard/charts/distribution');
    return response.data;
  },

  getVendorAllocation: async () => {
    const response = await api.get('/dashboard/charts/vendor-allocation');
    return response.data;
  },

  getRiskTrend: async () => {
    const response = await api.get('/dashboard/charts/risk-trend');
    return response.data;
  },

  getRecentMovements: async (limit = 5) => {
    const response = await api.get(`/dashboard/recent-movements?limit=${limit}`);
    return response.data;
  },
};