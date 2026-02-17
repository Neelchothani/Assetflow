export type UserRole = 'admin' | 'manager' | 'vendor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company?: string;
  phone?: string;
  department?: string;
  avatar?: string;
}

// Backend-aligned ATM type
export interface Atm {
  id: number;
  name: string;
  serialNumber: string;
  status: string;
  assetStatus?: string;
  location: string;
  branch?: string;
  vendor?: {
    id: number;
    name: string;
  } | null;
  value?: number;
  purchaseDate?: string;
  installationDate?: string;
  lastMaintenanceDate?: string;
  manufacturer?: string;
  model?: string;
  billingMonth?: string;
  billingStatus?: string;
  pickupDate?: string;
  cashCapacity?: number;
  notes?: string;
}

// Alias for Asset
export type Asset = Atm;

export interface Movement {
  id: number;
  atm?: {
    id: number;
    name: string;
    serialNumber?: string;
  };
  assetName?: string;
  assetId?: number;
  fromLocation: string;
  toLocation: string;
  movementType: string;
  status: string;
  initiatedBy: string;
  initiatedDate?: string;
  expectedDelivery?: string;
  docketNo?: string;
  businessGroup?: string;
  modeOfBill?: string;
}

export type AssetMovement = Movement;

export type StatusType = 
  | 'pending' 
  | 'in-transit' 
  | 'delivered' 
  | 'active' 
  | 'inactive' 
  | 'idle' 
  | 'maintenance'
  | 'approved'
  | 'rejected'
  | 'retired';

export interface Vendor {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  contactPerson?: string;
  taxId?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  status: StatusType;
  assetsAllocated?: number;
  activeSites?: number;
  totalCost?: number;
  rating?: number;
  joinedDate?: string;
}

export interface CostingItem {
  id: number;
  atm?: {
    id: number;
    name: string;
    serialNumber?: string;
    location?: string;
    notes?: string;
  };
  vendor?: {
    id: number;
    name: string;
  };
  billingStatus?: string;
  baseCost?: number; // true final cost (column N - Total Cost)
  hold?: number; // hold (column O)
  deduction?: number; // deduction (column P)
  finalAmount?: number; // final_amount (column Q)
  vendorCost?: number; // vendor cost per asset (column R)
  billingMonth?: string; // month from Excel (e.g., "Apr-25")
  status?: string;
  submittedBy?: string;
  submittedDate?: string;
  approvedBy?: string;
  approvedDate?: string;
}

export interface KPIData {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease';
  icon: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}
