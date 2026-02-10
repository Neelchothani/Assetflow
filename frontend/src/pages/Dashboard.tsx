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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
        const totalBase = res.reduce((s: number, it: any) => s + (Number(it.baseCost) || 0), 0);
        const totalVendor = res.reduce((s: number, it: any) => s + (Number(it.vendorCost) || 0), 0);
        setCostings({ totalBase, totalVendor });
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
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">P&L - Margins</CardTitle>
          <CardDescription>Base costings minus vendor costs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">₹{((costings.totalBase || 0) - (costings.totalVendor || 0)).toLocaleString()}</div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        <KPICard
          title="Total Base Costings"
          value={`₹${(costings.totalBase || 0).toLocaleString()}`}
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

      {/* Costing Breakdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Costing Breakdown</CardTitle>
          <CardDescription>Comparison of base costs, vendor costs, and margins</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                {
                  metric: 'Base Cost',
                  value: costings.totalBase || 0,
                },
                {
                  metric: 'Vendor Cost',
                  value: costings.totalVendor || 0,
                },
                {
                  metric: 'Margin',
                  value: (costings.totalBase || 0) - (costings.totalVendor || 0),
                },
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="metric"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tickFormatter={(v) => `₹${new Intl.NumberFormat('en-IN').format(Number(v))}`}
                width={120}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-lg)',
                  color: 'hsl(var(--foreground))',
                }}
                formatter={(value: number) => `₹${new Intl.NumberFormat('en-IN').format(Number(value))}`}
              />
              <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Movements */}
      <RecentMovements />
    </div>
  );
}
