import api from '@/lib/api';
import { Atm, Movement, Vendor, CostingItem } from '@/types';

interface SearchResult {
  id: number;
  title: string;
  description: string;
  page: string;
  type: 'asset' | 'movement' | 'vendor' | 'costing';
  link: string;
  searchText: string;
  pageNumber?: number; // For paginated tables
}

const PAGE_SIZE = 10; // Must match DataTable default pageSize

export const searchService = {
  searchAll: async (query: string): Promise<SearchResult[]> => {
    if (!query.trim()) return [];

    try {
      const [assets, movements, vendors, costings] = await Promise.all([
        api.get('/atms').catch(() => ({ data: [] })),
        api.get('/movements').catch(() => ({ data: [] })),
        api.get('/vendors').catch(() => ({ data: [] })),
        api.get('/costings').catch(() => ({ data: [] })),
      ]);

      const results: SearchResult[] = [];
      const q = query.toLowerCase();

      // Search Assets
      const assetList = assets.data || [];
      assetList.forEach((asset: Atm, index: number) => {
        if (
          asset.name?.toLowerCase().includes(q) ||
          asset.serialNumber?.toLowerCase().includes(q) ||
          asset.location?.toLowerCase().includes(q) ||
          asset.vendor?.name?.toLowerCase().includes(q)
        ) {
          const pageNumber = Math.floor(index / PAGE_SIZE) + 1;
          results.push({
            id: asset.id,
            title: asset.name,
            description: `Serial: ${asset.serialNumber} | Location: ${asset.location}`,
            page: 'Assets',
            type: 'asset',
            link: `/assets?highlight=${asset.id}&page=${pageNumber}`,
            searchText: `${asset.name} ${asset.serialNumber} ${asset.location}`,
            pageNumber,
          });
        }
      });

      // Search Movements
      const movementList = movements.data || [];
      movementList.forEach((movement: Movement, index: number) => {
        if (
          movement.atm?.name?.toLowerCase().includes(q) ||
          movement.fromLocation?.toLowerCase().includes(q) ||
          movement.toLocation?.toLowerCase().includes(q) ||
          movement.docketNo?.toLowerCase().includes(q)
        ) {
          const pageNumber = Math.floor(index / PAGE_SIZE) + 1;
          results.push({
            id: movement.id,
            title: movement.atm?.name || 'Unknown Asset',
            description: `${movement.fromLocation} → ${movement.toLocation}`,
            page: 'Movements',
            type: 'movement',
            link: `/movements?highlight=${movement.id}&page=${pageNumber}`,
            searchText: `${movement.atm?.name} ${movement.fromLocation} ${movement.toLocation}`,
            pageNumber,
          });
        }
      });

      // Search Vendors
      const vendorList = vendors.data || [];
      vendorList.forEach((vendor: Vendor, index: number) => {
        if (
          vendor.name?.toLowerCase().includes(q) ||
          vendor.email?.toLowerCase().includes(q) ||
          vendor.phone?.toLowerCase().includes(q)
        ) {
          const pageNumber = Math.floor(index / PAGE_SIZE) + 1;
          results.push({
            id: vendor.id,
            title: vendor.name,
            description: `${vendor.email || 'N/A'} | ${vendor.status}`,
            page: 'Vendors',
            type: 'vendor',
            link: `/vendors?highlight=${vendor.id}&page=${pageNumber}`,
            searchText: `${vendor.name} ${vendor.email}`,
            pageNumber,
          });
        }
      });

      // Search Costings
      const costingList = costings.data || [];
      costingList.forEach((costing: CostingItem, index: number) => {
        if (
          costing.atm?.name?.toLowerCase().includes(q) ||
          costing.vendor?.name?.toLowerCase().includes(q) ||
          costing.billingStatus?.toLowerCase().includes(q)
        ) {
          const pageNumber = Math.floor(index / PAGE_SIZE) + 1;
          results.push({
            id: costing.id,
            title: costing.atm?.name || 'Unknown Asset',
            description: `Vendor: ${costing.vendor?.name || 'N/A'} | Amount: ₹${costing.finalAmount || 0}`,
            page: 'Costings',
            type: 'costing',
            link: `/costing?highlight=${costing.id}&page=${pageNumber}`,
            searchText: `${costing.atm?.name} ${costing.vendor?.name}`,
            pageNumber,
          });
        }
      });

      // Sort by relevance (exact matches first)
      return results.sort((a, b) => {
        const aExact = a.searchText.toLowerCase().startsWith(q) ? 0 : 1;
        const bExact = b.searchText.toLowerCase().startsWith(q) ? 0 : 1;
        return aExact - bExact;
      });
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  },
};
