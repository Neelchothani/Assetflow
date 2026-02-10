import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { useHighlight } from '@/hooks/useHighlight';
import { costingService } from '@/services/costingService';
import { CostingItem } from '@/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

export default function Costing() {
	const [items, setItems] = useState<CostingItem[]>([]);
	const [loading, setLoading] = useState(true);
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

	const totals = useMemo(() => {
		const totalFinal = items.reduce((s, it) => s + (Number(it.finalAmount) || 0), 0);
		const totalVendor = items.reduce((s, it) => s + (Number(it.vendorCost) || 0), 0);
		return { totalFinal, totalVendor };
	}, [items]);

	const vendorSeries = useMemo(() => {
		const map = new Map<string, number>();
		items.forEach((it) => {
			const name = it.vendor?.name || it.atm?.name || 'Unknown';
			map.set(name, (map.get(name) || 0) + (Number(it.finalAmount) || 0));
		});
		return Array.from(map.entries()).map(([vendor, finalAmount]) => ({ vendor, finalAmount }));
	}, [items]);



	const handleExportCostings = () => {
		try {
			const exportData = items.map((it) => ({
				Asset: it.atm?.name || '-',
				Vendor: it.vendor?.name || '-',
				'Base Cost': it.baseCost != null ? Number(it.baseCost) : '-',
				Hold: it.hold != null ? Number(it.hold) : '-',
				Deduction: it.deduction != null ? Number(it.deduction) : '-',
				Total: it.finalAmount != null ? Number(it.finalAmount) : '-',
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
				<PageHeader title="Costings" description="View and analyze uploaded costings by vendor." />
				<div className="mt-2">
					<Button variant="outline" onClick={() => handleExportCostings()}>
						<Download className="w-4 h-4 mr-2" />
						Export
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Card>
					<CardHeader>
						<CardTitle>Total Final Costings</CardTitle>
						<CardDescription>Sum of final amounts from uploaded assets</CardDescription>
					</CardHeader>
					<CardContent>
						{loading ? (
							<Skeleton className="h-8 w-40" />
						) : (
							<div className="text-2xl font-bold">₹{inFormatter.format(totals.totalFinal)}</div>
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

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<Card className="lg:col-span-2 h-[360px]">
					<CardHeader>
						<CardTitle>Vendor-wise Final Costings</CardTitle>
						<CardDescription>Aggregated final amounts per vendor</CardDescription>
					</CardHeader>
					<CardContent className="h-[300px]">
						{loading ? (
							<Skeleton className="h-full" />
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={vendorSeries} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="vendor" />
									<YAxis tickFormatter={(v) => `₹${inFormatter.format(Number(v))}`} />
									<Tooltip formatter={(value: number) => [`₹${inFormatter.format(Number(value))}`, 'Final']} />
									<Line type="monotone" dataKey="finalAmount" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
								</LineChart>
							</ResponsiveContainer>
						)}
					</CardContent>
				</Card>

				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Quick Summary</CardTitle>
							<CardDescription>Vendor-wise costings breakdown</CardDescription>
						</CardHeader>
						<CardContent>
							{loading ? (
								<Skeleton className="h-48" />
							) : vendorSeries.length === 0 ? (
								<p className="text-sm text-muted-foreground">No costing data available</p>
							) : (
								<div className="space-y-2">
									<div className="max-h-64 overflow-y-auto space-y-2">
										{vendorSeries.map((item, idx) => (
											<div key={idx} className="flex items-center justify-between pb-2 border-b last:border-0">
												<div className="text-sm truncate flex-1 text-muted-foreground">{item.vendor}</div>
												<div className="font-semibold ml-2">₹{inFormatter.format(Number(item.finalAmount))}</div>
											</div>
										))}
									</div>
									<div className="flex items-center justify-between pt-2 border-t font-bold text-base">
										<div className="text-sm">Total</div>
										<div>₹{inFormatter.format(totals.totalVendor)}</div>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>

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
										<TableCell colSpan={8}>
											<Skeleton className="h-8" />
										</TableCell>
									</TableRow>
								) : (
									filteredItems.map((it) => (
										<TableRow key={it.id} id={`highlight-${it.id}`} className="cursor-pointer" onClick={() => setSelectedItem(it)}>
											<TableCell>{it.atm?.name || '—'}</TableCell>
											<TableCell>{it.vendor?.name || '—'}</TableCell>
											<TableCell className="text-right">₹{inFormatter.format(Number(it.baseCost) || 0)}</TableCell>
											<TableCell className="text-right">₹{inFormatter.format(Number(it.hold) || 0)}</TableCell>
											<TableCell className="text-right">₹{inFormatter.format(Number(it.deduction) || 0)}</TableCell>
											<TableCell className="text-right font-bold">₹{inFormatter.format(Number(it.finalAmount) || 0)}</TableCell>
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
								<p className="text-sm text-muted-foreground">Total</p>
								<p className="text-2xl font-bold">₹{inFormatter.format(Number(selectedItem.finalAmount) || 0)}</p>
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

