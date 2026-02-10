import { PageHeader } from '@/components/common/PageHeader';
import { KPICard } from '@/components/dashboard/KPICard';
import { AssetDistributionChart } from '@/components/dashboard/AssetDistributionChart';
import { VendorAllocationChart } from '@/components/dashboard/VendorAllocationChart';
import { RecentMovements } from '@/components/dashboard/RecentMovements';
import { useEffect, useState } from 'react';
import { dashboardService } from '@/services/dashboardService';
import { costingService } from '@/services/costingService';
import { movementService } from '@/services/movementService';
import {
  Package,
  Activity,
  Users,
  ArrowLeftRight,
  DollarSign,
} from 'lucide-react';

export default function Dashboard() {
  const [kpis, setKpis] = useState<any>({});
  const [costings, setCostings] = useState<any>({});
  const [totalMovements, setTotalMovements] = useState(0);

  useEffect(() => {
    dashboardService.getKPIs().then((res) => setKpis(res)).catch(() => setKpis({}));
  }, []);

  useEffect(() => {
    const fetchCostings = async () => {
      try {
        const res = await costingService.getAllCostings();
        const totalFinal = res.reduce((s: number, it: any) => s + (Number(it.finalAmount) || 0), 0);
        const totalVendor = res.reduce((s: number, it: any) => s + (Number(it.vendorCost) || 0), 0);
        setCostings({ totalFinal, totalVendor });
      } catch (e) {
        console.error(e);
      }
    };
    fetchCostings();
  }, []);

  useEffect(() => {
    const fetchMovements = async () => {
      try {
        const res = await movementService.getAllMovements();
        setTotalMovements(res.length);
      } catch (e) {
        console.error(e);
      }
    };
    fetchMovements();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your asset management system"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Assets"
          value={(kpis.totalAssets || 0).toLocaleString()}
          icon={Package}
          iconColor="bg-primary/10 text-primary"
        />
        <KPICard
          title="Active Assets"
          value={(kpis.activeAssets || 0).toLocaleString()}
          icon={Activity}
          iconColor="bg-success/10 text-success"
        />
        <KPICard
          title="Total Vendors"
          value={kpis.totalVendors || 0}
          icon={Users}
          iconColor="bg-info/10 text-info"
        />
        <KPICard
          title="Total Movements"
          value={totalMovements.toLocaleString()}
          icon={ArrowLeftRight}
          iconColor="bg-primary/10 text-primary"
        />
      </div>

      {/* Costings KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        <KPICard
          title="Total Final Costings"
          value={`₹${(costings.totalFinal || 0).toLocaleString()}`}
          icon={DollarSign}
          iconColor="bg-success/10 text-success"
        />
        <KPICard
          title="Total Vendor Costs"
          value={`₹${(costings.totalVendor || 0).toLocaleString()}`}
          icon={DollarSign}
          iconColor="bg-accent/10 text-accent"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AssetDistributionChart />
        <VendorAllocationChart />
      </div>

      {/* Recent Movements */}
      <RecentMovements />
    </div>
  );
}
