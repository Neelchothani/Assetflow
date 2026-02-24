import { PageHeader } from '@/components/common/PageHeader';
import { KPICard } from '@/components/dashboard/KPICard';
import { AssetDistributionChart } from '@/components/dashboard/AssetDistributionChart';
import { VendorAllocationChart } from '@/components/dashboard/VendorAllocationChart';
import { RecentMovements } from '@/components/dashboard/RecentMovements';
import { useEffect, useState, useMemo } from 'react';
import { dashboardService } from '@/services/dashboardService';
import { costingService } from '@/services/costingService';
import { movementService } from '@/services/movementService';
import { atmService } from '@/services/atmService';
import {
  Package,
  Activity,
  Users,
  ArrowLeftRight,
  DollarSign,
  X,
  Clock,
  Search,
  Banknote,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  const [atms, setAtms] = useState<any[]>([]);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [showAmountModal, setShowAmountModal] = useState(false);
  const [amountTab, setAmountTab] = useState<'received' | 'not-received'>('received');
  const [amountSearch, setAmountSearch] = useState('');

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

  useEffect(() => {
    atmService.getAssets().then(setAtms).catch((e) => console.error(e));
  }, []);

  const computeAgeing = (pickupDate?: string, deliveryDate?: string): number | null => {
    if (!pickupDate) return null;
    const start = new Date(pickupDate);
    if (isNaN(start.getTime())) return null;
    const end = deliveryDate ? new Date(deliveryDate) : new Date();
    if (isNaN(end.getTime())) return null;
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const assetAgeingList = useMemo(() => {
    return atms
      .map((atm) => ({
        id: atm.id,
        name: atm.name,
        serialNumber: atm.serialNumber,
        pickupDate: atm.pickupDate,
        deliveryDate: atm.deliveryDate,
        ageing: computeAgeing(atm.pickupDate, atm.deliveryDate),
      }))
      .filter((a) => a.ageing !== null)
      .sort((a, b) => b.ageing! - a.ageing!);
  }, [atms]);

  const avgAssetAgeing = useMemo(() => {
    if (assetAgeingList.length === 0) return null;
    const sum = assetAgeingList.reduce((s, a) => s + a.ageing!, 0);
    return Math.round(sum / assetAgeingList.length);
  }, [assetAgeingList]);

  const vendorAgeingList = useMemo(() => {
    const map: { [vendorName: string]: number[] } = {};
    atms.forEach((atm) => {
      const ageing = computeAgeing(atm.pickupDate, atm.deliveryDate);
      if (ageing === null) return;
      const vendorName = atm.vendor?.name || 'Unknown';
      if (!map[vendorName]) map[vendorName] = [];
      map[vendorName].push(ageing);
    });
    return Object.entries(map)
      .map(([name, days]) => ({
        name,
        avgAgeing: Math.round(days.reduce((s, d) => s + d, 0) / days.length),
        assetCount: days.length,
      }))
      .sort((a, b) => b.avgAgeing - a.avgAgeing);
  }, [atms]);

  const avgVendorAgeing = useMemo(() => {
    if (vendorAgeingList.length === 0) return null;
    const sum = vendorAgeingList.reduce((s, v) => s + v.avgAgeing, 0);
    return Math.round(sum / vendorAgeingList.length);
  }, [vendorAgeingList]);

  const filteredAssets = useMemo(() => {
    if (!assetSearch.trim()) return assetAgeingList;
    const q = assetSearch.trim().toLowerCase();
    return assetAgeingList.filter(
      (a) =>
        String(a.id).includes(q) ||
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.serialNumber && a.serialNumber.toLowerCase().includes(q))
    );
  }, [assetAgeingList, assetSearch]);

  const filteredVendors = useMemo(() => {
    if (!vendorSearch.trim()) return vendorAgeingList;
    const q = vendorSearch.trim().toLowerCase();
    return vendorAgeingList.filter((v) => v.name.toLowerCase().includes(q));
  }, [vendorAgeingList, vendorSearch]);

  // Amount received lists
  // "Received" bucket: amountReceived is null / empty / "Received" (all count toward the total)
  const isNotReceived = (atm: any) =>
    atm.amountReceived && atm.amountReceived.toLowerCase().includes('not');

  const receivedAtms = useMemo(
    () => atms.filter((atm) => !isNotReceived(atm)),
    [atms]
  );

  const notReceivedAtms = useMemo(
    () => atms.filter((atm) => isNotReceived(atm)),
    [atms]
  );

  const totalReceivedValue = useMemo(
    () => receivedAtms.reduce((s, atm) => s + (Number(atm.value) || 0), 0),
    [receivedAtms]
  );

  const filteredAmountList = useMemo(() => {
    const list = amountTab === 'received' ? receivedAtms : notReceivedAtms;
    if (!amountSearch.trim()) return list;
    const q = amountSearch.trim().toLowerCase();
    return list.filter(
      (atm) =>
        String(atm.id).includes(q) ||
        (atm.name && atm.name.toLowerCase().includes(q)) ||
        (atm.serialNumber && atm.serialNumber.toLowerCase().includes(q))
    );
  }, [amountTab, receivedAtms, notReceivedAtms, amountSearch]);

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

      {/* Amount Received Card */}
      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowAmountModal(true)}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-green-600" />
            <CardTitle className="text-3xl">Amount Received</CardTitle>
          </div>
          <CardDescription>
            Total value of assets with payment received or pending confirmation — click to view breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-green-600">
            ₹{totalReceivedValue.toLocaleString()}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {receivedAtms.length} asset{receivedAtms.length !== 1 ? 's' : ''} ·{' '}
            <span className="text-red-500">{notReceivedAtms.length} not received</span>
          </p>
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

      {/* Ageing Analysis Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Card 1: Average Asset Ageing */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowAssetModal(true)}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Avg. Asset Ageing</CardTitle>
            </div>
            <CardDescription>Days from pickup to delivery (or today) — click to view details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {avgAssetAgeing !== null ? `${avgAssetAgeing} days` : 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {assetAgeingList.length} asset{assetAgeingList.length !== 1 ? 's' : ''} with pickup data
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Average Vendor Ageing */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowVendorModal(true)}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Avg. Ageing by Vendor</CardTitle>
            </div>
            <CardDescription>Average asset ageing grouped by vendor — click to view details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {avgVendorAgeing !== null ? `${avgVendorAgeing} days` : 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {vendorAgeingList.length} vendor{vendorAgeingList.length !== 1 ? 's' : ''} with pickup data
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Amount Received Modal */}
      <Dialog open={showAmountModal} onOpenChange={(open) => { setShowAmountModal(open); if (!open) { setAmountSearch(''); setAmountTab('received'); } }}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Amount Received Breakdown</DialogTitle>
            <DialogDescription>
              {amountTab === 'received'
                ? `${receivedAtms.length} assets — includes confirmed received and unset entries (all count toward total)`
                : `${notReceivedAtms.length} assets with payment not yet received (excluded from total)`}
            </DialogDescription>
          </DialogHeader>

          {/* Tab buttons */}
          <div className="flex gap-3 mb-2">
            <Button
              variant={amountTab === 'received' ? 'default' : 'outline'}
              onClick={() => { setAmountTab('received'); setAmountSearch(''); }}
            >
              Received ({receivedAtms.length})
            </Button>
            <Button
              variant={amountTab === 'not-received' ? 'default' : 'outline'}
              onClick={() => { setAmountTab('not-received'); setAmountSearch(''); }}
            >
              Not Received ({notReceivedAtms.length})
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ATM ID, name or serial number…"
              className="pl-9"
              value={amountSearch}
              onChange={(e) => setAmountSearch(e.target.value)}
            />
          </div>

          {/* Summary strip */}
          {amountTab === 'received' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-50 border border-green-200 text-sm mb-2">
              <Banknote className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-green-800 font-medium">
                Total: ₹{totalReceivedValue.toLocaleString()}
              </span>
              <span className="text-green-600 ml-auto">{receivedAtms.length} assets</span>
            </div>
          )}

          <div className="overflow-y-auto flex-1">
            {filteredAmountList.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No assets found</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background border-b z-10">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">ID</th>
                    <th className="text-left py-3 px-4 font-semibold">ATM / Serial</th>
                    <th className="text-left py-3 px-4 font-semibold">Vendor</th>
                    <th className="text-right py-3 px-4 font-semibold">Value (₹)</th>
                    <th className="text-right py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAmountList.map((atm: any) => {
                    const ar = atm.amountReceived;
                    const isRec = ar && ar.toLowerCase() === 'received';
                    const isNotRec = ar && ar.toLowerCase().includes('not');
                    const badge = isRec
                      ? <span className="inline-block text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">Received</span>
                      : isNotRec
                      ? <span className="inline-block text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5">Not Received</span>
                      : <span className="inline-block text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">N/A</span>;
                    return (
                      <tr key={atm.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 text-muted-foreground">{atm.id}</td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{atm.name || '—'}</div>
                          <div className="text-xs text-muted-foreground">{atm.serialNumber || ''}</div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{atm.vendor?.name || '—'}</td>
                        <td className="py-3 px-4 text-right font-medium">
                          {atm.value != null ? `₹${Number(atm.value).toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">{badge}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Asset Ageing Modal */}
      <Dialog open={showAssetModal} onOpenChange={(open) => { setShowAssetModal(open); if (!open) setAssetSearch(''); }}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Asset Ageing Details</DialogTitle>
            <DialogDescription>
              All assets with pickup data, sorted by ageing (highest first)
            </DialogDescription>
          </DialogHeader>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ATM ID, name or serial number…"
              className="pl-9"
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredAssets.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No assets found</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background border-b z-10">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">ID</th>
                    <th className="text-left py-3 px-4 font-semibold">ATM / Serial</th>
                    <th className="text-left py-3 px-4 font-semibold">Pickup Date</th>
                    <th className="text-right py-3 px-4 font-semibold">Ageing</th>
                    <th className="text-right py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map((a) => {
                    const isOngoing = !a.deliveryDate;
                    const ageClass =
                      a.ageing! > 90
                        ? 'text-red-500 font-semibold'
                        : a.ageing! > 30
                        ? 'text-amber-500 font-semibold'
                        : 'text-green-600 font-semibold';
                    return (
                      <tr key={a.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 text-muted-foreground">{a.id}</td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{a.name || '—'}</div>
                          <div className="text-xs text-muted-foreground">{a.serialNumber || ''}</div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{a.pickupDate || '—'}</td>
                        <td className={`py-3 px-4 text-right ${ageClass}`}>{a.ageing} days</td>
                        <td className="py-3 px-4 text-right">
                          {isOngoing ? (
                            <span className="inline-block text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">Ongoing</span>
                          ) : (
                            <span className="inline-block text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">Delivered</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Vendor Ageing Modal */}
      <Dialog open={showVendorModal} onOpenChange={(open) => { setShowVendorModal(open); if (!open) setVendorSearch(''); }}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Vendor Ageing Details</DialogTitle>
            <DialogDescription>
              Average asset ageing per vendor, sorted highest first
            </DialogDescription>
          </DialogHeader>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vendor by name…"
              className="pl-9"
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredVendors.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No vendors found</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background border-b z-10">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">#</th>
                    <th className="text-left py-3 px-4 font-semibold">Vendor Name</th>
                    <th className="text-center py-3 px-4 font-semibold">Assets</th>
                    <th className="text-right py-3 px-4 font-semibold">Avg. Ageing</th>
                    <th className="text-right py-3 px-4 font-semibold">Band</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((v, idx) => {
                    const ageClass =
                      v.avgAgeing > 90
                        ? 'text-red-500 font-semibold'
                        : v.avgAgeing > 30
                        ? 'text-amber-500 font-semibold'
                        : 'text-green-600 font-semibold';
                    const band =
                      v.avgAgeing > 90
                        ? { label: '> 90 days', cls: 'bg-red-100 text-red-700' }
                        : v.avgAgeing > 30
                        ? { label: '31–90 days', cls: 'bg-amber-100 text-amber-700' }
                        : { label: '≤ 30 days', cls: 'bg-green-100 text-green-700' };
                    return (
                      <tr key={v.name} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 text-muted-foreground">{idx + 1}</td>
                        <td className="py-3 px-4 font-medium">{v.name}</td>
                        <td className="py-3 px-4 text-center text-muted-foreground">{v.assetCount}</td>
                        <td className={`py-3 px-4 text-right ${ageClass}`}>{v.avgAgeing} days</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`inline-block text-xs rounded-full px-2 py-0.5 ${band.cls}`}>{band.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
