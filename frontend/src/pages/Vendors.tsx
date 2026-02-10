import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, Column } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { useHighlight } from '@/hooks/useHighlight';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { vendorService } from '@/services/vendorService';
import { costingService } from '@/services/costingService';
import { Vendor } from '@/types';
import { Plus, Star, Building2, Package, MapPin, DollarSign, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [costingsLoading, setCostingsLoading] = useState(true);
  const [costings, setCostings] = useState<any[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [editRating, setEditRating] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>('active');
  const [openAddVendor, setOpenAddVendor] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    contactPerson: '',
    taxId: '',
    contractStartDate: '',
    contractEndDate: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  useHighlight();

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setIsLoading(true);
        const fetchedVendors = await vendorService.getAllVendors();
        // Normalize status and numeric fields for frontend
        const normalized = fetchedVendors.map((v: any) => ({
          ...v,
          status: v.status ? String(v.status).toLowerCase() : v.status,
          rating: v.rating ? Number(v.rating) : 0,
          totalCost: v.totalCost ? Number(v.totalCost) : 0,
        }));
        setVendors(normalized);
      } catch (error) {
        console.error('Failed to fetch vendors:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVendors();
  }, []);

  useEffect(() => {
    const fetchCostings = async () => {
      try {
        setCostingsLoading(true);
        const costingsData = await costingService.getAllCostings();
        setCostings(costingsData || []);
      } catch (error) {
        console.error('Failed to fetch costings:', error);
        setCostings([]);
      } finally {
        setCostingsLoading(false);
      }
    };
    fetchCostings();
  }, []);

  useEffect(() => {
    if (selectedVendor) {
      setEditRating(selectedVendor.rating || 0);
      setEditStatus(selectedVendor.status || 'active');
    }
  }, [selectedVendor]);

  const handleOpenAdd = () => {
    setForm({
      name: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
      contactPerson: '',
      taxId: '',
      contractStartDate: '',
      contractEndDate: '',
    });
    setFormError(null);
    setOpenAddVendor(true);
  };

  const handleCreateVendor = async () => {
    setFormError(null);
    if (!form.name || !form.phone) {
      setFormError('Name and phone are required');
      return;
    }

    try {
      const payload = {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone,
        address: form.address || undefined,
        contactPerson: form.contactPerson || undefined,
        taxId: form.taxId || undefined,
        contractStartDate: form.contractStartDate || undefined,
        contractEndDate: form.contractEndDate || undefined,
        notes: form.notes || undefined,
      };

      const created = await vendorService.createVendor(payload);
      const normalized = {
        ...created,
        status: created.status ? String(created.status).toLowerCase() : created.status,
        rating: created.rating ? Number(created.rating) : 0,
        totalCost: created.totalCost ? Number(created.totalCost) : 0,
        assetsAllocated: created.assetsAllocated ? Number(created.assetsAllocated) : 0,
      };
      setVendors((prev) => [normalized as Vendor, ...prev]);
      setOpenAddVendor(false);
    } catch (err: any) {
      console.error('Create vendor failed', err);
      setFormError(err?.response?.data?.message || 'Failed to create vendor');
    }
  };

  const columns: Column<Vendor>[] = [
    {
      key: 'name',
      header: 'Vendor',
      render: (vendor) => (
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {vendor.name.split(' ').map((n) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{vendor.name}</p>
            <p className="text-xs text-muted-foreground">{vendor.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (vendor) => <StatusBadge status={vendor.status} />,
    },
    {
      key: 'assetsAllocated',
      header: 'Assets',
      render: (vendor) => (
        <span className="font-medium">{vendor.assetsAllocated}</span>
      ),
    },
    // Active Sites column removed per request
    {
      key: 'totalCost',
      header: 'Total Cost',
      render: (vendor) => (
        <span className="font-medium">₹{new Intl.NumberFormat('en-IN').format(Number(vendor.totalCost || 0))}</span>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (vendor) => (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-warning text-warning" />
          <span className="font-medium">{vendor.rating.toFixed(1)}</span>
        </div>
      ),
    },
  ];

  const totalAssets = vendors.reduce((sum, v) => sum + (v.assetsAllocated || 0), 0);
  const activeVendors = vendors.filter((v) => v.status === 'active').length;
  const inactiveVendors = vendors.filter((v) => v.status === 'inactive').length;
  const totalVendorCost = vendors.reduce((sum, v) => sum + (Number(v.totalCost) || 0), 0);
  const avgRating =
    vendors.length > 0
      ? (vendors.reduce((sum, v) => sum + v.rating, 0) / vendors.length).toFixed(1)
      : 0;

  const inFormatter = new Intl.NumberFormat('en-IN');

  const vendorSeries = useMemo(() => {
    const map = new Map<string, number>();
    costings.forEach((it) => {
      const name = it.vendor?.name || it.atm?.name || 'Unknown';
      map.set(name, (map.get(name) || 0) + (Number(it.baseCost) || 0));
    });
    return Array.from(map.entries()).map(([vendor, baseCost]) => ({ vendor, baseCost }));
  }, [costings]);

  const costingTotals = useMemo(() => {
    const totalBase = costings.reduce((s, it) => s + (Number(it.baseCost) || 0), 0);
    const totalVendor = costings.reduce((s, it) => s + (Number(it.vendorCost) || 0), 0);
    return { totalBase, totalVendor };
  }, [costings]);

  const handleExportVendors = () => {
    try {
      const exportData = vendors.map((v) => ({
        'Name': v.name || '-',
        'Email': v.email || '-',
        'Phone': v.phone || '-',
        'Address': v.address || '-',
        'Status': v.status || '-',
        'Rating': v.rating != null ? v.rating : '-',
        'Assets Allocated': v.assetsAllocated != null ? v.assetsAllocated : '-',
        'Total Cost': v.totalCost != null ? v.totalCost : '-',
        'Freight Category': (v as any).freightCategory || '-',
        'Notes': (v as any).notes || '-',
        'Joined Date': v.joinedDate || '-',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendors');

      worksheet['!cols'] = [
        { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 40 }, { wch: 18 },
      ];

      const date = new Date().toISOString().split('T')[0];
      const filename = `Vendors_${date}.xlsx`;
      XLSX.writeFile(workbook, filename);
    } catch (e) {
      console.error('Failed to export vendors', e);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Management"
        description="Manage MSP and vendor relationships"
        actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => handleExportVendors()}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={handleOpenAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Add Vendor
              </Button>
            </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Vendors</p>
                {isLoading ? <Skeleton className="h-7 w-12 mt-1" /> : <p className="text-2xl font-bold">{vendors.length}</p>}
              </div>
              <Building2 className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active / Inactive</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{activeVendors} / {inactiveVendors}</p>
                )}
              </div>
              <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Allocated Assets</p>
                {isLoading ? <Skeleton className="h-7 w-20 mt-1" /> : <p className="text-2xl font-bold">{totalAssets}</p>}
              </div>
              <Package className="w-8 h-8 text-accent/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Rating</p>
                {isLoading ? <Skeleton className="h-7 w-16 mt-1" /> : <p className="text-2xl font-bold">{avgRating}</p>}
              </div>
              <Star className="w-8 h-8 text-warning/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendor-wise Base Costings Chart and Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 h-[360px]">
          <CardHeader>
            <CardTitle>Vendor-wise Base Costings</CardTitle>
            <CardDescription>Aggregated base costs per vendor</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {costingsLoading ? (
              <Skeleton className="h-full" />
            ) : vendorSeries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No costing data available</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vendorSeries} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="vendor"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tickFormatter={(v) => `₹${inFormatter.format(Number(v))}`}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-card p-3 border border-border rounded shadow-lg">
                            <p className="text-sm font-medium text-foreground">{data.vendor}</p>
                            <p className="text-sm text-[#0ea5e9]">₹{inFormatter.format(Number(data.baseCost))}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line type="monotone" dataKey="baseCost" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
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
              {costingsLoading ? (
                <Skeleton className="h-48" />
              ) : vendorSeries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No costing data available</p>
              ) : (
                <div className="space-y-2">
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {vendorSeries.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between pb-2 border-b last:border-0">
                        <div className="text-sm truncate flex-1 text-muted-foreground">{item.vendor}</div>
                        <div className="font-semibold ml-2">₹{inFormatter.format(Number(item.baseCost))}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t font-bold text-base">
                    <div className="text-sm">Total</div>
                    <div>₹{inFormatter.format(costingTotals.totalBase)}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <DataTable
        data={vendors}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search vendors..."
        onRowClick={setSelectedVendor}
      />

      {/* Vendor Detail Dialog */}
      <Dialog open={!!selectedVendor} onOpenChange={() => setSelectedVendor(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {selectedVendor?.name.split(' ').map((n) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p>{selectedVendor?.name}</p>
                <p className="text-sm font-normal text-muted-foreground">
                  {selectedVendor?.email}
                </p>
              </div>
            </DialogTitle>
            <DialogDescription>
              Vendor details and allocated resources
            </DialogDescription>
          </DialogHeader>

          {selectedVendor && (
            <div className="grid gap-6 py-4">
              {/* Status & Rating */}
              <div className="flex items-center justify-between">
                <StatusBadge status={selectedVendor.status} />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <select
                      className="rounded-md border px-2 py-1 text-sm"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rating:</span>
                    <div className="flex items-center">
                      {[1,2,3,4,5].map((i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setEditRating(i)}
                          className="p-1"
                          aria-label={`Rate ${i}`}
                        >
                          <Star className={`w-5 h-5 ${i <= editRating ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />
                        </button>
                      ))}
                      <span className="ml-2 text-muted-foreground">{editRating}/5</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <Package className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-2xl font-bold">{selectedVendor.assetsAllocated}</p>
                        <p className="text-sm text-muted-foreground">Assets Allocated</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Cost Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Cost Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Cost</span>
                      <span className="text-xl font-bold">
                        ₹{new Intl.NumberFormat('en-IN').format(Number(selectedVendor.totalCost || 0))}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cost Utilization</span>
                        <span className="font-medium">
                          {totalVendorCost > 0
                            ? `${((Number(selectedVendor.totalCost || 0) / totalVendorCost) * 100).toFixed(1)}%`
                            : '0%'}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: totalVendorCost > 0 ? `${(Number(selectedVendor.totalCost || 0) / totalVendorCost) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact */}
              <div className="text-sm">
                <p className="text-muted-foreground">Contact: {selectedVendor.phone}</p>
                <p className="text-muted-foreground">
                  Member since: {new Date(selectedVendor.joinedDate).toLocaleDateString()}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedVendor(null);
                  }}
                >
                  Cancel
                </Button>

                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!selectedVendor) return;
                    const ok = window.confirm(`Delete vendor ${selectedVendor.name}? This action cannot be undone.`);
                    if (!ok) return;
                    try {
                      await vendorService.deleteVendor(selectedVendor.id);
                      setVendors((prev) => prev.filter(v => v.id !== selectedVendor.id));
                      setSelectedVendor(null);
                    } catch (err) {
                      console.error('Failed to delete vendor:', err);
                      // Optional: show user-visible error here
                    }
                  }}
                >
                  Delete
                </Button>

                <Button
                  onClick={async () => {
                    if (!selectedVendor) return;
                    try {
                      // Update rating if changed
                      if (Number(selectedVendor.rating) !== Number(editRating)) {
                        const updated = await vendorService.updateRating(selectedVendor.id, editRating);
                        // normalize
                        updated.status = updated.status ? String(updated.status).toLowerCase() : updated.status;
                        updated.rating = Number(updated.rating || 0);
                        setSelectedVendor(updated);
                        setVendors((prev) => prev.map(v => v.id === updated.id ? updated : v));
                      }

                      // Update status if changed
                      if ((selectedVendor.status || '') !== editStatus) {
                        const updated2 = await vendorService.updateStatus(selectedVendor.id, editStatus);
                        updated2.status = updated2.status ? String(updated2.status).toLowerCase() : updated2.status;
                        updated2.rating = Number(updated2.rating || 0);
                        setSelectedVendor(updated2);
                        setVendors((prev) => prev.map(v => v.id === updated2.id ? updated2 : v));
                      }
                    } catch (err) {
                      console.error('Failed to update vendor:', err);
                    }
                  }}
                >
                  Update
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Vendor Dialog */}
      <Dialog open={openAddVendor} onOpenChange={() => setOpenAddVendor(false)}>
        <DialogContent className="sm:max-w-3xl">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 rounded-md p-3">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Add Vendor</CardTitle>
                  <CardDescription>Provide vendor details — assets are managed separately</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Name *</label>
                  <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Vendor name" />

                  <label className="text-sm text-muted-foreground mb-2 block mt-4">Email</label>
                  <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email address" />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Phone *</label>
                  <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Phone number" />

                  <label className="text-sm text-muted-foreground mb-2 block mt-4">Address</label>
                  <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Address" />
                </div>

                <div className="col-span-2">
                  <label className="text-sm text-muted-foreground mb-2 block">Notes</label>
                  <Textarea className="w-full h-40" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional notes" />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end">
                {formError && <p className="text-destructive text-sm mr-auto">{formError}</p>}
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setOpenAddVendor(false)}>Cancel</Button>
                  <Button onClick={handleCreateVendor}>Create Vendor</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  );
}

