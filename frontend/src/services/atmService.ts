import api from '@/lib/api';
import { Atm } from '@/types';

export interface CreateAssetPayload {
  name: string;
  serialNumber: string;
  location: string;
  branch?: string;
  vendorId?: number;
  value: number;
  purchaseDate: string;
  installationDate?: string;
  manufacturer?: string;
  model?: string;
  cashCapacity?: number;
  notes?: string;
  assetStatus?: string;
  billingMonth?: string;
  billingStatus?: string;
  pickupDate?: string;
}

export type UpdateAssetPayload = Partial<CreateAssetPayload>;

export const atmService = {
  getAssets: async (): Promise<Atm[]> => {
    const response = await api.get('/atms');
    return response.data;
  },

  getAtmById: async (id: number): Promise<Atm> => {
    const response = await api.get(`/atms/${id}`);
    return response.data;
  },

  searchAtms: async (keyword: string): Promise<Atm[]> => {
    const response = await api.get(`/atms/search?keyword=${encodeURIComponent(keyword)}`);
    return response.data;
  },

  createAsset: async (payload: CreateAssetPayload): Promise<Atm> => {
    const response = await api.post('/atms', payload);
    return response.data;
  },

  updateAsset: async (id: number, payload: UpdateAssetPayload): Promise<Atm> => {
    const response = await api.put(`/atms/${id}`, payload);
    return response.data;
  },

  deleteAsset: async (id: number): Promise<void> => {
    await api.delete(`/atms/${id}`);
  },
};