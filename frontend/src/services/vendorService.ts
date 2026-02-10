import api from '@/lib/api';
import { Vendor } from '@/types';

export const vendorService = {
  getAllVendors: async (): Promise<Vendor[]> => {
    const response = await api.get('/vendors');
    return response.data;
  },

  getVendorById: async (id: number) => {
    const response = await api.get(`/vendors/${id}`);
    return response.data;
  },

  searchVendors: async (keyword: string) => {
    const response = await api.get(`/vendors/search?keyword=${encodeURIComponent(keyword)}`);
    return response.data;
  },

  updateRating: async (id: number, rating: number) => {
    const response = await api.patch(`/vendors/${id}/rating?rating=${rating}`);
    return response.data;
  },

  updateStatus: async (id: number, status: string) => {
    const response = await api.patch(`/vendors/${id}/status?status=${encodeURIComponent(status)}`);
    return response.data;
  },

  createVendor: async (payload: object) => {
    const response = await api.post('/vendors', payload);
    return response.data;
  },
  deleteVendor: async (id: number) => {
    const response = await api.delete(`/vendors/${id}`);
    return response.data;
  },
};