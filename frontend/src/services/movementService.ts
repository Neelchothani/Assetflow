import api from '@/lib/api';
import { Movement } from '@/types';

export const movementService = {
  getAllMovements: async (): Promise<Movement[]> => {
    const response = await api.get('/movements');
    return response.data;
  },

  getRecentMovements: async (limit = 5): Promise<Movement[]> => {
    const response = await api.get(`/movements/recent?limit=${limit}`);
    return response.data;
  },

  getMovementById: async (id: number) => {
    const response = await api.get(`/movements/${id}`);
    return response.data;
  },
  createMovement: async (payload: any) => {
    const response = await api.post('/movements', payload);
    return response.data;
  },
  updateMovement: async (id: number, payload: any) => {
    const response = await api.put(`/movements/${id}`, payload);
    return response.data;
  },

  deleteMovement: async (id: number) => {
    const response = await api.delete(`/movements/${id}`);
    return response.data;
  },
};