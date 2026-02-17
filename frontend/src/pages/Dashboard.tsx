import { PageHeader } from '@/components/common/PageHeader';
import { KPICard } from '@/components/dashboard/KPICard';
import { AssetDistributionChart } from '@/components/dashboard/AssetDistributionChart';
import { VendorAllocationChart } from '@/components/dashboard/VendorAllocationChart';
import { RecentMovements } from '@/components/dashboard/RecentMovements';
import { useEffect, useState, useMemo } from 'react';
import { dashboardService } from '@/services/dashboardService';
import { costingService } from '@/services/costingService';
import { movementService } from '@/services/movementService';
import {
  Package,
  Activity,
  Users,
  ArrowLeftRight,
  DollarSign,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'recharts';

const inFormatter = new Intl.NumberFormat('en-IN');

interface PeriodSummary {
	period: string;
	baseCost: number;
	vendorCost: number;
	margin: number;
	itemCount: number;
}

// Helper function to parse "Apr-25" to year "2025"
const extractYear = (billingMonth: string | undefined): string => {
	if (!billingMonth || billingMonth === 'N/A' || billingMonth.trim() === '' || typeof billingMonth !== 'string') {
		return 'Unknown';
	}
	
	const trimmed = billingMonth.trim();
	const parts = trimmed.split('-');
	
	if (parts.length !== 2) {
		return 'Unknown';
	}
	
	const yearStr = parts[1].trim();
	const yearNum = parseInt(yearStr, 10);
	
	if (isNaN(yearNum)) {
		return 'Unknown';
	}
	
	const fullYear = yearNum > 50 ? 1900 + yearNum : 2000 + yearNum;
	return fullYear.toString();
};

// Helper function to convert "Apr-25" to a sortable date number (202504)
const getMonthSortKey = (period: string): number => {
	if (period === 'Unknown') return 999999;
	
	const parts = period.trim().split('-');
	if (parts.length !== 2) return 999999;
	
	const monthStr = parts[0].toLowerCase();
	const yearStr = parts[1];
	
	const monthMap: { [key: string]: number } = {
		jan: 1, january: 1,
		feb: 2, february: 2,
		mar: 3, march: 3,
		apr: 4, april: 4,
		may: 5,
		jun: 6, june: 6,
		jul: 7, july: 7,
		aug: 8, august: 8,
		sep: 9, sept: 9, september: 9,
		oct: 10, october: 10,
		nov: 11, november: 11,
		dec: 12, december: 12,
	};
	
	const monthNum = monthMap[monthStr] || 0;
	const yearNum = parseInt(yearStr, 10);
	const fullYear = yearNum > 50 ? 1900 + yearNum : 2000 + yearNum;
	
	return fullYear * 100 + monthNum;
};

export default function Dashboard() {
  const [kpis, setKpis] = useState<any>({});
  const [costings, setCostings] = useState<any>({});
  const [costingItems, setCostingItems] = useState<any[]>([]);
  const [totalMovements, setTotalMovements] = useState(0);
  const [showPLModal, setShowPLModal] = useState(false);
  const [viewMode, setViewMode] = useState<'year' | 'month'>('year');

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
        setCostingItems(res || []);
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

  // Year-wise summary
  const yearWiseSummary = useMemo(() => {
    const grouped: { [key: string]: PeriodSummary } = {};
    
    costingItems.forEach((item) => {
      const year = extractYear(item.billingMonth);
      if (!grouped[year]) {
        grouped[year] = {
          period: year,
          baseCost: 0,
          vendorCost: 0,
          margin: 0,
          itemCount: 0,
        };
      }
      grouped[year].baseCost += Number(item.baseCost) || 0;
      grouped[year].vendorCost += Number(item.vendorCost) || 0;
      grouped[year].itemCount += 1;
    });

    Object.values(grouped).forEach((period) => {
      period.margin = period.baseCost - period.vendorCost;
    });

    return Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
  }, [costingItems]);

  // Month-wise summary
  const monthWiseSummary = useMemo(() => {
    const grouped: { [key: string]: PeriodSummary } = {};
    
    costingItems.forEach((item) => {
      const period = item.billingMonth || 'Unknown';
      if (!grouped[period]) {
        grouped[period] = {
          period: period,
          baseCost: 0,
          vendorCost: 0,
          margin: 0,
          itemCount: 0,
        };
      }
      grouped[period].baseCost += Number(item.baseCost) || 0;
      grouped[period].vendorCost += Number(item.vendorCost) || 0;
      grouped[period].itemCount += 1;
    });

    Object.values(grouped).forEach((period) => {
      period.margin = period.baseCost - period.vendorCost;
    });

    return Object.values(grouped).sort((a, b) => getMonthSortKey(a.period) - getMonthSortKey(b.period));
  }, [costingItems]);

  const displayedSummary = viewMode === 'year' ? yearWiseSummary : monthWiseSummary;

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
      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowPLModal(true)}>
        <CardHeader>
          <CardTitle className="text-3xl">P&L - Margins</CardTitle>
          <CardDescription>Base costings minus vendor costs (Click to view trends)</CardDescription>
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

      {/* P&L Trends Modal */}
      <Dialog open={showPLModal} onOpenChange={setShowPLModal}>
        <DialogContent className="max-w-6xl h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>P&L Trend Analysis</DialogTitle>
            <DialogDescription>
              Year-wise and month-wise breakdown of P&L margins and costs
            </DialogDescription>
          </DialogHeader>

          {/* Tab Toggle */}
          <div className="flex gap-3 mb-6">
            <Button
              variant={viewMode === 'year' ? 'default' : 'outline'}
              onClick={() => setViewMode('year')}
            >
              Year
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              onClick={() => setViewMode('month')}
            >
              Month
            </Button>
          </div>

          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>P&L Trend {viewMode === 'year' ? 'by Year' : 'by Month'}</CardTitle>
              <CardDescription>{viewMode === 'year' ? 'Yearly' : 'Monthly'} aggregated P&L margins and costs trends</CardDescription>
            </CardHeader>
            <CardContent>
              {displayedSummary.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No data available</p>
              ) : (
                <div className="w-full h-80">
                  <svg width="100%" height="0" style={{ position: 'absolute' }}>
                    <defs>
                      <linearGradient id="colorMargin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorBaseCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorVendorCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                  </svg>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={displayedSummary}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="period"
                        stroke="#6b7280"
                        style={{ fontSize: '0.875rem' }}
                      />
                      <YAxis
                        stroke="#6b7280"
                        style={{ fontSize: '0.875rem' }}
                        tickFormatter={(value) => `₹${(value / 1000000).toFixed(0)}M`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        }}
                        formatter={(value: any) => `₹${inFormatter.format(Math.round(value))}`}
                        labelStyle={{ color: '#1f2937' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="margin"
                        stroke="#10b981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorMargin)"
                        isAnimationActive={true}
                        name="P&L Margin"
                      />
                      <Area
                        type="monotone"
                        dataKey="baseCost"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fillOpacity={0.5}
                        fill="url(#colorBaseCost)"
                        isAnimationActive={true}
                        name="Base Cost"
                      />
                      <Area
                        type="monotone"
                        dataKey="vendorCost"
                        stroke="#ef4444"
                        strokeWidth={2}
                        fillOpacity={0.3}
                        fill="url(#colorVendorCost)"
                        isAnimationActive={true}
                        name="Vendor Cost"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed {viewMode === 'year' ? 'Yearly' : 'Monthly'} Summary</CardTitle>
              <CardDescription>Complete breakdown of costs and margins</CardDescription>
            </CardHeader>
            <CardContent>
              {displayedSummary.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No data available</p>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold">{viewMode === 'year' ? 'Year' : 'Month'}</th>
                        <th className="text-right py-3 px-4 font-semibold">Base Cost</th>
                        <th className="text-right py-3 px-4 font-semibold">Vendor Cost</th>
                        <th className="text-right py-3 px-4 font-semibold">P&L Margin</th>
                        <th className="text-center py-3 px-4 font-semibold">Items</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedSummary.map((period, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">{period.period}</td>
                          <td className="text-right py-3 px-4">₹{inFormatter.format(Math.round(period.baseCost))}</td>
                          <td className="text-right py-3 px-4">₹{inFormatter.format(Math.round(period.vendorCost))}</td>
                          <td className="text-right py-3 px-4 font-semibold text-green-600">₹{inFormatter.format(Math.round(period.margin))}</td>
                          <td className="text-center py-3 px-4 text-muted-foreground">{period.itemCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  );
}
