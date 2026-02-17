import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { useHighlight } from '@/hooks/useHighlight';
import { costingService } from '@/services/costingService';
import { CostingItem } from '@/types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Input } from '@/components/ui/input';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

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
	// Handle null, undefined, N/A, or empty strings
	if (!billingMonth || billingMonth === 'N/A' || billingMonth.trim() === '' || typeof billingMonth !== 'string') {
		return 'Unknown';
	}
	
	const trimmed = billingMonth.trim();
	const parts = trimmed.split('-');
	
	// Must have exactly 2 parts (month-year)
	if (parts.length !== 2) {
		console.warn('Invalid billing month format:', billingMonth);
		return 'Unknown';
	}
	
	const yearStr = parts[1].trim();
	const yearNum = parseInt(yearStr, 10);
	
	// Check if parsing resulted in NaN
	if (isNaN(yearNum)) {
		console.warn('Invalid year in billing month:', billingMonth);
		return 'Unknown';
	}
	
	// Handle 2-digit year (25 -> 2025, 99 -> 1999)
	const fullYear = yearNum > 50 ? 1900 + yearNum : 2000 + yearNum;
	return fullYear.toString();
};

// Helper function to convert "Apr-25" or "Apr-25" to a sortable date number (202504)
const getMonthSortKey = (period: string): number => {
	if (period === 'Unknown') return 999999; // Push Unknown to the end
	
	const parts = period.trim().split('-');
	if (parts.length !== 2) return 999999;
	
	const monthStr = parts[0].toLowerCase();
	const yearStr = parts[1];
	
	// Map month names to numbers
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
	
	// Return a sortable number: YYYYMM (e.g., 202504 for Apr-25)
	return fullYear * 100 + monthNum;
};

export default function Costing() {
	const [items, setItems] = useState<CostingItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [viewMode, setViewMode] = useState<'year' | 'month'>('year');
	useHighlight();

	useEffect(() => {
		const fetch = async () => {
			try {
				setLoading(true);
				const res = await costingService.getAllCostings();
				setItems(res || []);
			} catch (e) {
				console.error(e);
			} finally {
				setLoading(false);
			}
		};
		fetch();
	}, []);

	const [search, setSearch] = useState('');
	const [selectedItem, setSelectedItem] = useState<CostingItem | null>(null);

	// Overall totals
	const totals = useMemo(() => {
		const totalBase = items.reduce((s, it) => s + (Number(it.baseCost) || 0), 0);
		const totalVendor = items.reduce((s, it) => s + (Number(it.vendorCost) || 0), 0);
		return { totalBase, totalVendor };
	}, [items]);

	// Group by year
	const yearWiseSummary = useMemo(() => {
		const grouped: { [key: string]: PeriodSummary } = {};
		
		items.forEach((item) => {
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

		// Calculate margins
		Object.values(grouped).forEach((period) => {
			period.margin = period.baseCost - period.vendorCost;
		});

		return Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
	}, [items]);

	// Group by month (format: "Apr-25")
	const monthWiseSummary = useMemo(() => {
		const grouped: { [key: string]: PeriodSummary } = {};
		
		items.forEach((item) => {
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

		// Calculate margins
		Object.values(grouped).forEach((period) => {
			period.margin = period.baseCost - period.vendorCost;
		});

		return Object.values(grouped).sort((a, b) => getMonthSortKey(a.period) - getMonthSortKey(b.period));
	}, [items]);

	const displayedSummary = viewMode === 'year' ? yearWiseSummary : monthWiseSummary;

	const handleExportCostings = () => {
		try {
			const exportData = items.map((it) => ({
				Asset: it.atm?.name || '-',
				Vendor: it.vendor?.name || '-',
				Month: it.billingMonth || '-',
				'Base Cost': it.baseCost != null ? Number(it.baseCost) : '-',
				Hold: it.hold != null ? Number(it.hold) : '-',
				Deduction: it.deduction != null ? Number(it.deduction) : '-',
				Total: it.baseCost != null ? Number(it.baseCost) : '-',
				'Vendor Cost': it.vendorCost != null ? Number(it.vendorCost) : '-',
				'Billing Status': it.billingStatus || '-',
				Description: (it as any).description || (it as any).notes || it.atm?.notes || '-',
			}));

			const worksheet = XLSX.utils.json_to_sheet(exportData);
			const workbook = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(workbook, worksheet, 'Costings');
			XLSX.writeFile(workbook, 'costings.xlsx');
		} catch (err) {
			console.error('Export failed', err);
		}
	};

	const filteredItems = useMemo(() => {
		if (!search.trim()) return items;
		const q = search.toLowerCase();
		return items.filter((it) => {
			const atmName = String(it.atm?.name || '').toLowerCase();
			const vendorName = String(it.vendor?.name || '').toLowerCase();
			return atmName.includes(q) || vendorName.includes(q);
		});
	}, [items, search]);

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between">
				<PageHeader title="Costings" description="View and analyze uploaded costings by vendor and time period." />
				<div className="mt-2">
					<Button variant="outline" onClick={() => handleExportCostings()}>
						<Download className="w-4 h-4 mr-2" />
						Export
					</Button>
				</div>
			</div>

			<Card className="md:col-span-2">
				<CardHeader>
					<CardTitle className="text-3xl">P&L - Margins (Overall)</CardTitle>
					<CardDescription>Base costings minus vendor costs</CardDescription>
				</CardHeader>
				<CardContent>
					{loading ? (
						<Skeleton className="h-12 w-48" />
					) : (
						<div className="text-4xl font-bold">₹{inFormatter.format(totals.totalBase - totals.totalVendor)}</div>
					)}
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Card>
					<CardHeader>
					<CardTitle>Total Base Costings</CardTitle>
					<CardDescription>Sum of base costs from uploaded assets</CardDescription>
					</CardHeader>
					<CardContent>
						{loading ? (
							<Skeleton className="h-8 w-40" />
						) : (
							<div className="text-2xl font-bold">₹{inFormatter.format(totals.totalBase)}</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Total Vendor Costs</CardTitle>
						<CardDescription>Sum of per-asset vendor costs</CardDescription>
					</CardHeader>
					<CardContent>
						{loading ? (
							<Skeleton className="h-8 w-40" />
						) : (
							<div className="text-2xl font-bold">₹{inFormatter.format(totals.totalVendor)}</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Period-wise View Toggle and Chart */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>P&L Trend by {viewMode === 'year' ? 'Year' : 'Month'}</CardTitle>
							<CardDescription>
								{viewMode === 'year'
									? 'Yearly aggregated P&L margins and costs trends'
									: 'Monthly aggregated P&L margins and costs trends'}
							</CardDescription>
						</div>
						<div className="flex gap-2">
							<Button
								variant={viewMode === 'year' ? 'default' : 'outline'}
								onClick={() => setViewMode('year')}
								className="w-20"
							>
								Year
							</Button>
							<Button
								variant={viewMode === 'month' ? 'default' : 'outline'}
								onClick={() => setViewMode('month')}
								className="w-20"
							>
								Month
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{loading ? (
						<Skeleton className="h-96" />
					) : displayedSummary.length === 0 ? (
						<p className="text-muted-foreground text-center py-8">No data available</p>
					) : (
						<div className="w-full h-96">
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
										fillOpacity={0}
										isAnimationActive={true}
										name="Base Cost"
										strokeDasharray="5 5"
									/>
									<Area
										type="monotone"
										dataKey="vendorCost"
										stroke="#ef4444"
										strokeWidth={2}
										fillOpacity={0}
										isAnimationActive={true}
										name="Vendor Cost"
										strokeDasharray="5 5"
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
					{loading ? (
						<div className="space-y-2">
							<Skeleton className="h-12" />
							<Skeleton className="h-12" />
							<Skeleton className="h-12" />
						</div>
					) : displayedSummary.length === 0 ? (
						<p className="text-muted-foreground">No data available</p>
					) : (
						<div className="overflow-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>{viewMode === 'year' ? 'Year' : 'Month'}</TableHead>
										<TableHead className="text-right">Base Cost</TableHead>
										<TableHead className="text-right">Vendor Cost</TableHead>
										<TableHead className="text-right">P&L Margin</TableHead>
										<TableHead className="text-right">Items</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{displayedSummary.map((period) => (
										<TableRow key={period.period}>
											<TableCell className="font-medium">{period.period}</TableCell>
											<TableCell className="text-right">₹{inFormatter.format(period.baseCost)}</TableCell>
											<TableCell className="text-right">₹{inFormatter.format(period.vendorCost)}</TableCell>
											<TableCell className="text-right font-bold text-green-600">
												₹{inFormatter.format(period.margin)}
											</TableCell>
											<TableCell className="text-right">{period.itemCount}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Costing Items</CardTitle>
					<CardDescription>Mapped columns from uploaded Excel</CardDescription>
				</CardHeader>
				<CardContent>
					{/* Search bar just below the graph */}
					<div className="mb-4">
						<Input placeholder="Search by asset or vendor" value={search} onChange={(e) => setSearch(e.target.value)} />
					</div>
					<div className="overflow-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Asset</TableHead>
									<TableHead>Month</TableHead>
									<TableHead>Vendor</TableHead>
									<TableHead className="text-right">Base Cost</TableHead>
									<TableHead className="text-right">Hold</TableHead>
									<TableHead className="text-right">Deduction</TableHead>
									<TableHead className="text-right">Total</TableHead>
									<TableHead className="text-right">Vendor Cost</TableHead>
									<TableHead>Billing Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{loading ? (
									<TableRow>
										<TableCell colSpan={9}>
											<Skeleton className="h-8" />
										</TableCell>
									</TableRow>
								) : (
									filteredItems.map((it) => (
										<TableRow key={it.id} id={`highlight-${it.id}`} className="cursor-pointer" onClick={() => setSelectedItem(it)}>
											<TableCell>{it.atm?.name || '—'}</TableCell>
											<TableCell>{it.billingMonth || '—'}</TableCell>
											<TableCell>{it.vendor?.name || '—'}</TableCell>
											<TableCell className="text-right">₹{inFormatter.format(Number(it.baseCost) || 0)}</TableCell>
											<TableCell className="text-right">₹{inFormatter.format(Number(it.hold) || 0)}</TableCell>
											<TableCell className="text-right">₹{inFormatter.format(Number(it.deduction) || 0)}</TableCell>
											<TableCell className="text-right font-bold">₹{inFormatter.format(Number(it.baseCost) || 0)}</TableCell>
											<TableCell className="text-right">₹{inFormatter.format(Number(it.vendorCost) || 0)}</TableCell>
											<TableCell>{<StatusBadge status={it.billingStatus as any} />}</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{/* Detail dialog for a costing item */}
			<Dialog open={!!selectedItem} onOpenChange={(open) => { if (!open) setSelectedItem(null); }}>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>Costing Details</DialogTitle>
						<DialogDescription>
							Detailed description and breakdown for the selected costing item.
						</DialogDescription>
					</DialogHeader>

					{selectedItem && (
						<div className="space-y-4">
							<div>
								<p className="text-sm text-muted-foreground">Asset</p>
								<p className="font-medium">{selectedItem.atm?.name || '—'}</p>
							</div>

							<div>
								<p className="text-sm text-muted-foreground">Billing Month</p>
								<p className="font-medium">{selectedItem.billingMonth || '—'}</p>
							</div>

							<div>
								<p className="text-sm text-muted-foreground">Vendor</p>
								<p className="font-medium">{selectedItem.vendor?.name || '—'}</p>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<p className="text-sm text-muted-foreground">Base Cost</p>
									<p className="font-medium">₹{inFormatter.format(Number(selectedItem.baseCost) || 0)}</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Vendor Cost</p>
									<p className="font-medium">₹{inFormatter.format(Number(selectedItem.vendorCost) || 0)}</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Hold</p>
									<p className="font-medium">₹{inFormatter.format(Number(selectedItem.hold) || 0)}</p>
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Deduction</p>
									<p className="font-medium">₹{inFormatter.format(Number(selectedItem.deduction) || 0)}</p>
								</div>
							</div>

							<div>
								<p className="text-sm text-muted-foreground">P&L Margin</p>
								<p className="text-2xl font-bold text-green-600">₹{inFormatter.format((Number(selectedItem.baseCost) || 0) - (Number(selectedItem.vendorCost) || 0))}</p>
							</div>

							<div>
								<p className="text-sm text-muted-foreground">Billing Status</p>
								<div className="mt-1">{<StatusBadge status={selectedItem.billingStatus as any} />}</div>
							</div>

							<div>
								<p className="text-sm text-muted-foreground">Description</p>
								<p className="whitespace-pre-wrap">{(selectedItem as any).description || (selectedItem as any).notes || selectedItem.atm?.notes || 'No description'}</p>
							</div>

							<div className="flex justify-end">
								<Button onClick={() => setSelectedItem(null)}>Close</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}

