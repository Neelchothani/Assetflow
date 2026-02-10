import api from '@/lib/api';
import { CostingItem } from '@/types';

export const costingService = {
  getAllCostings: async (): Promise<CostingItem[]> => {
    const response = await api.get('/costings');
    return response.data;
  },

  getPendingCostings: async (): Promise<CostingItem[]> => {
    const response = await api.get('/costings/pending');
    return response.data;
  },
};