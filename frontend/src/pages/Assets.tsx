import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, Column } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useHighlight } from '@/hooks/useHighlight';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Asset, Vendor } from '@/types';
import { Plus, Download, Filter, X, Trash2 } from 'lucide-react';
import { atmService, CreateAssetPayload, UpdateAssetPayload } from '@/services/atmService';
import { useToast } from '@/hooks/use-toast';
import { vendorService } from '@/services/vendorService';
import * as XLSX from 'xlsx';

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [amountReceivedFilter, setAmountReceivedFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  useHighlight();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<CreateAssetPayload>({
    name: '',
    serialNumber: '',
    location: '',
    branch: '',
    vendorId: undefined,
    value: 0,
    purchaseDate: '',
    installationDate: '',
    manufacturer: '',
    model: '',
    cashCapacity: undefined,
    notes: '',
    assetStatus: '',
    billingMonth: '',
    billingStatus: '',
    pickupDate: '',
    deliveryDate: '',
    amountReceived: '',
  });

  const [editData, setEditData] = useState<UpdateAssetPayload>({});

  useEffect(() => {
    fetchAssets();
    fetchVendors();
  }, []);

  const fetchAssets = async () => {
    try {
      setIsLoading(true);
      const fetchedAssets = await atmService.getAssets();
      setAssets(fetchedAssets);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch assets',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const fetchedVendors = await vendorService.getAllVendors();
      setVendors(fetchedVendors);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'value' || name === 'cashCapacity'
          ? value === ''
            ? undefined
            : parseFloat(value)
          : name === 'vendorId'
            ? value === ''
              ? undefined
              : parseInt(value)
            : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      !formData.name ||
      !formData.serialNumber ||
      !formData.location ||
      formData.value === 0 ||
      !formData.purchaseDate
    ) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    // Validate vendor exists if vendorId is provided
    if (formData.vendorId) {
      const vendorExists = vendors.some((v) => v.id === formData.vendorId);
      if (!vendorExists) {
        toast({
          title: 'Validation Error',
          description: `Vendor with ID ${formData.vendorId} does not exist. Please select a valid vendor.`,
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const newAsset = await atmService.createAsset(formData);
      setAssets((prev) => [...prev, newAsset]);
      setShowAddDialog(false);
      setFormData({
        name: '',
        serialNumber: '',
        location: '',
        branch: '',
        vendorId: undefined,
        value: 0,
        purchaseDate: '',
        installationDate: '',
        manufacturer: '',
        model: '',
        cashCapacity: undefined,
        notes: '',
        assetStatus: '',
        billingMonth: '',
        billingStatus: '',
        pickupDate: '',
        deliveryDate: '',
        amountReceived: '',
      });
      toast({
        title: 'Success',
        description: 'Asset created successfully',
      });
    } catch (error) {
      console.error('Failed to create asset:', error);
      toast({
        title: 'Error',
        description: 'Failed to create asset',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetail = (asset: Asset) => {
    setSelectedAsset(asset);
    setEditData({});
    setShowDetailPanel(true);
  };

  const handleCloseDetail = () => {
    setShowDetailPanel(false);
    setSelectedAsset(null);
    setEditData({});
  };

  const handleEditChange = (field: keyof UpdateAssetPayload, value: any) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const hasChanges = Object.keys(editData).length > 0;

  const handleUpdateAsset = async () => {
    if (!selectedAsset) return;

    try {
      setIsUpdating(true);
      // Merge edited data with current asset data to ensure all required fields are sent
      const updatePayload: UpdateAssetPayload = {
        name: editData.name !== undefined ? editData.name : selectedAsset.name,
        serialNumber: editData.serialNumber !== undefined ? editData.serialNumber : selectedAsset.serialNumber,
        location: editData.location !== undefined ? editData.location : selectedAsset.location,
        branch: editData.branch !== undefined ? editData.branch : selectedAsset.branch,
        vendorId: editData.vendorId !== undefined ? editData.vendorId : selectedAsset.vendor?.id,
        value: editData.value !== undefined ? editData.value : selectedAsset.value,
        purchaseDate: editData.purchaseDate !== undefined ? editData.purchaseDate : selectedAsset.purchaseDate,
        installationDate: editData.installationDate !== undefined ? editData.installationDate : selectedAsset.installationDate,
        manufacturer: editData.manufacturer !== undefined ? editData.manufacturer : selectedAsset.manufacturer,
        model: editData.model !== undefined ? editData.model : selectedAsset.model,
        cashCapacity: editData.cashCapacity !== undefined ? editData.cashCapacity : selectedAsset.cashCapacity,
        notes: editData.notes !== undefined ? editData.notes : selectedAsset.notes,
        assetStatus: editData.assetStatus !== undefined ? editData.assetStatus : selectedAsset.assetStatus,
        billingMonth: editData.billingMonth !== undefined ? editData.billingMonth : selectedAsset.billingMonth,
        billingStatus: editData.billingStatus !== undefined ? editData.billingStatus : selectedAsset.billingStatus,
        pickupDate: editData.pickupDate !== undefined ? editData.pickupDate : selectedAsset.pickupDate,
        deliveryDate: editData.deliveryDate !== undefined ? editData.deliveryDate : selectedAsset.deliveryDate,
        amountReceived: editData.amountReceived !== undefined ? editData.amountReceived : selectedAsset.amountReceived,
      };

      const updatedAsset = await atmService.updateAsset(selectedAsset.id, updatePayload);
      setAssets((prev) =>
        prev.map((asset) => (asset.id === selectedAsset.id ? updatedAsset : asset))
      );
      setSelectedAsset(updatedAsset);
      setEditData({});
      toast({
        title: 'Success',
        description: 'Asset updated successfully',
      });
      // Close the detail panel automatically after successful update
      setTimeout(() => {
        setShowDetailPanel(false);
      }, 500);
    } catch (error) {
      console.error('Failed to update asset:', error);
      toast({
        title: 'Error',
        description: 'Failed to update asset',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAsset = async () => {
    if (!selectedAsset) return;

    try {
      setIsDeleting(true);
      await atmService.deleteAsset(selectedAsset.id);
      setAssets((prev) => prev.filter((asset) => asset.id !== selectedAsset.id));
      setShowDetailPanel(false);
      setShowDeleteDialog(false);
      setSelectedAsset(null);
      toast({
        title: 'Success',
        description: 'Asset deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete asset:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete asset',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportAssets = () => {
    try {
      // Prepare data for export
      const exportData = assets.map((asset) => {
        const pickupDate = asset.pickupDate ? new Date(asset.pickupDate) : null;
        const deliveryDate = asset.deliveryDate ? new Date(asset.deliveryDate) : null;
        const ageingDays = pickupDate
          ? Math.floor(((deliveryDate ?? new Date()).getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        return {
          'Asset Name': asset.name,
          'Serial Number': asset.serialNumber,
          'Location': asset.location,
          'Branch': asset.branch || '-',
          'Vendor': asset.vendor?.name || '-',
          'Value (₹)': asset.value?.toLocaleString() || '-',
          'Asset Status': asset.assetStatus || '-',
          'Billing Month': asset.billingMonth || '-',
          'Billing Status': asset.billingStatus || '-',
          'Purchase Date': asset.purchaseDate || '-',
          'Installation Date': asset.installationDate || '-',
          'Pickup Date': asset.pickupDate || '-',
          'Delivery Date': asset.deliveryDate || 'Not Delivered',
          'Amount Received': asset.amountReceived || '-',
          'Ageing (Days)': ageingDays !== null ? ageingDays : '-',
          'Manufacturer': asset.manufacturer || '-',
          'Model': asset.model || '-',
          'Cash Capacity (₹)': asset.cashCapacity?.toLocaleString() || '-',
          'Description': asset.notes || '-',
        };
      });

      // Create a new workbook
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');

      // Set column widths for better readability
      const columnWidths = [
        { wch: 20 }, // Asset Name
        { wch: 15 }, // Serial Number
        { wch: 20 }, // Location
        { wch: 15 }, // Branch
        { wch: 20 }, // Vendor
        { wch: 12 }, // Value
        { wch: 15 }, // Asset Status
        { wch: 15 }, // Billing Month
        { wch: 15 }, // Billing Status
        { wch: 15 }, // Purchase Date
        { wch: 15 }, // Installation Date
        { wch: 15 }, // Pickup Date
        { wch: 15 }, // Delivery Date
        { wch: 16 }, // Amount Received
        { wch: 14 }, // Ageing
        { wch: 15 }, // Manufacturer
        { wch: 12 }, // Model
        { wch: 15 }, // Cash Capacity
        { wch: 25 }, // Description
      ];
      worksheet['!cols'] = columnWidths;

      // Generate filename with current date
      const date = new Date().toISOString().split('T')[0];
      const filename = `Assets_${date}.xlsx`;

      // Trigger download
      XLSX.writeFile(workbook, filename);

      toast({
        title: 'Success',
        description: `Exported ${assets.length} assets to ${filename}`,
      });
    } catch (error) {
      console.error('Failed to export assets:', error);
      toast({
        title: 'Error',
        description: 'Failed to export assets',
        variant: 'destructive',
      });
    }
  };

  const categories = [...new Set(assets.map((a) => a.notes || 'Unknown').filter(Boolean))];

  const filteredAssets = assets.filter((asset) => {
    if (categoryFilter !== 'all' && (asset.notes || 'Unknown') !== categoryFilter) return false;
    if (statusFilter !== 'all' && asset.billingStatus !== statusFilter) return false;
    if (amountReceivedFilter !== 'all' && (asset.amountReceived || '') !== amountReceivedFilter) return false;
    return true;
  });

  const columns: Column<Asset>[] = [
    {
      key: 'name',
      header: 'Asset Name',
      render: (asset) => (
        <div
          className="cursor-pointer hover:text-blue-600"
          onClick={() => handleOpenDetail(asset)}
        >
          <p className="font-medium">{asset.name}</p>
          <p className="text-xs text-muted-foreground">{asset.serialNumber}</p>
        </div>
      ),
    },
    {
      key: 'notes',
      header: 'Asset Description',
      render: (asset) => (
        <div onClick={() => handleOpenDetail(asset)} className="cursor-pointer">
          <Badge variant="secondary">{asset.notes || 'Unknown'}</Badge>
        </div>
      ),
    },
    {
      key: 'assetStatus',
      header: 'Asset Status',
      render: (asset) => (
        <div onClick={() => handleOpenDetail(asset)} className="cursor-pointer">
          <Badge variant="outline">{asset.assetStatus || 'N/A'}</Badge>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (asset) => (
        <div onClick={() => handleOpenDetail(asset)} className="cursor-pointer">
          {asset.location}
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      render: (asset) => (
        <div onClick={() => handleOpenDetail(asset)} className="cursor-pointer">
          <span className="font-medium">₹{asset.value?.toLocaleString() || 'N/A'}</span>
        </div>
      ),
    },
    {
      key: 'billingMonth',
      header: 'Billing Month',
      render: (asset) => (
        <div onClick={() => handleOpenDetail(asset)} className="cursor-pointer">
          {asset.billingMonth || 'N/A'}
        </div>
      ),
    },
    {
      key: 'pickupDate',
      header: 'Pick Up Date',
      render: (asset) => (
        <div onClick={() => handleOpenDetail(asset)} className="cursor-pointer">
          {asset.pickupDate ? new Date(asset.pickupDate).toLocaleDateString() : 'N/A'}
        </div>
      ),
    },
    {
      key: 'deliveryDate',
      header: 'Delivery Date',
      render: (asset) => (
        <div onClick={() => handleOpenDetail(asset)} className="cursor-pointer">
          {asset.deliveryDate
            ? new Date(asset.deliveryDate).toLocaleDateString()
            : <span className="text-amber-600 font-medium">Not Delivered</span>}
        </div>
      ),
    },
    {
      key: 'billingStatus',
      header: 'Billing Status',
      render: (asset) => (
        <div onClick={() => handleOpenDetail(asset)} className="cursor-pointer">
          <StatusBadge status={asset.billingStatus as any} />
        </div>
      ),
    },
    {
      key: 'ageing',
      header: 'Ageing (Days)',
      render: (asset) => {
        if (!asset.pickupDate) {
          return (
            <div onClick={() => handleOpenDetail(asset)} className="cursor-pointer text-muted-foreground">
              N/A
            </div>
          );
        }
        const pickup = new Date(asset.pickupDate);
        const end = asset.deliveryDate ? new Date(asset.deliveryDate) : new Date();
        const diffMs = end.getTime() - pickup.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const label = asset.deliveryDate ? `${diffDays} days` : `${diffDays} days (ongoing)`;
        const colorClass = diffDays > 90
          ? 'text-red-600 font-semibold'
          : diffDays > 30
          ? 'text-amber-600 font-medium'
          : 'text-green-600 font-medium';
        return (
          <div onClick={() => handleOpenDetail(asset)} className={`cursor-pointer ${colorClass}`}>
            {label}
          </div>
        );
      },
    },
    {
      key: 'amountReceived',
      header: 'Amount Received',
      render: (asset) => {
        const val = asset.amountReceived;
        const isReceived = val && val.toLowerCase() === 'received';
        const isNotReceived = val && val.toLowerCase().includes('not');
        return (
          <div onClick={() => handleOpenDetail(asset)} className="cursor-pointer">
            {!val ? (
              <span className="text-muted-foreground">N/A</span>
            ) : isReceived ? (
              <span className="inline-block text-xs font-medium bg-green-100 text-green-700 rounded-full px-2 py-0.5">Received</span>
            ) : isNotReceived ? (
              <span className="inline-block text-xs font-medium bg-red-100 text-red-700 rounded-full px-2 py-0.5">Not Received</span>
            ) : (
              <span>{val}</span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        description="Manage and track all company assets"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportAssets}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Asset
            </Button>
          </div>
        }
      />

      {/* Add Asset Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Asset</DialogTitle>
            <DialogDescription>Fill in all the required information to create a new asset</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Name and Serial Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Asset Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., ATM-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumber">
                  Serial Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="serialNumber"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., SN123456"
                  required
                />
              </div>
            </div>

            {/* Row 2: Location and Branch */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">
                  Location <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., New York Branch"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  name="branch"
                  value={formData.branch}
                  onChange={handleInputChange}
                  placeholder="e.g., NY-Central"
                />
              </div>
            </div>

            {/* Row 3: Vendor */}
            <div className="space-y-2">
              <Label htmlFor="vendorId">Vendor</Label>
              <Select value={formData.vendorId?.toString() || 'none'} onValueChange={(val) => {
                setFormData((prev) => ({
                  ...prev,
                  vendorId: val === 'none' ? undefined : parseInt(val),
                }));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a vendor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Vendor</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 4: Value and Purchase Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">
                  Value (₹) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="value"
                  name="value"
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchaseDate">
                  Purchase Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="purchaseDate"
                  name="purchaseDate"
                  type="date"
                  value={formData.purchaseDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {/* Row 5: Installation Date and Manufacturer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="installationDate">Installation Date</Label>
                <Input
                  id="installationDate"
                  name="installationDate"
                  type="date"
                  value={formData.installationDate}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  name="manufacturer"
                  value={formData.manufacturer}
                  onChange={handleInputChange}
                  placeholder="e.g., NCR"
                />
              </div>
            </div>

            {/* Row 6: Model and Cash Capacity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  name="model"
                  value={formData.model}
                  onChange={handleInputChange}
                  placeholder="e.g., 5678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cashCapacity">Cash Capacity (₹)</Label>
                <Input
                  id="cashCapacity"
                  name="cashCapacity"
                  type="number"
                  step="0.01"
                  value={formData.cashCapacity}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Row 7: Asset Status and Billing Month */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assetStatus">Asset Status</Label>
                <Input
                  id="assetStatus"
                  name="assetStatus"
                  value={formData.assetStatus}
                  onChange={handleInputChange}
                  placeholder="e.g., Approved, Not Approved"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingMonth">Billing Month</Label>
                <Input
                  id="billingMonth"
                  name="billingMonth"
                  value={formData.billingMonth}
                  onChange={handleInputChange}
                  placeholder="e.g., January 2025"
                />
              </div>
            </div>

            {/* Row 8: Billing Status and Pickup Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billingStatus">Billing Status</Label>
                <Input
                  id="billingStatus"
                  name="billingStatus"
                  value={formData.billingStatus}
                  onChange={handleInputChange}
                  placeholder="e.g., Pending, Completed"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickupDate">Pickup Date</Label>
                <Input
                  id="pickupDate"
                  name="pickupDate"
                  type="date"
                  value={formData.pickupDate}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Row 8b: Delivery Date + Amount Received */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deliveryDate">Delivery Date</Label>
                <Input
                  id="deliveryDate"
                  name="deliveryDate"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amountReceived">Amount Received</Label>
                <Select
                  value={formData.amountReceived || 'none'}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, amountReceived: val === 'none' ? '' : val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    <SelectItem value="Received">Received</SelectItem>
                    <SelectItem value="Not received">Not Received</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 9: Description */}
            <div className="space-y-2">
              <Label htmlFor="notes">Asset Description</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Enter asset description or notes"
                rows={3}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Asset'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg bg-card border border-border">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Asset Description" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Descriptions</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Billing Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Billing Statuses</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Not Approved">Not Approved</SelectItem>
          </SelectContent>
        </Select>

        <Select value={amountReceivedFilter} onValueChange={setAmountReceivedFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Amount Received" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payment States</SelectItem>
            <SelectItem value="Received">Received</SelectItem>
            <SelectItem value="Not received">Not Received</SelectItem>
          </SelectContent>
        </Select>

        {(categoryFilter !== 'all' || statusFilter !== 'all' || amountReceivedFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCategoryFilter('all');
              setStatusFilter('all');
              setAmountReceivedFilter('all');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <DataTable
        data={filteredAssets}
        columns={columns}
        isLoading={isLoading}
        searchKey="name"
        searchPlaceholder="Search assets..."
      />

      {/* Asset Detail Panel */}
      <Dialog open={showDetailPanel} onOpenChange={setShowDetailPanel}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <DialogTitle>{selectedAsset?.name}</DialogTitle>
                <DialogDescription>{selectedAsset?.serialNumber}</DialogDescription>
              </div>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5 text-red-600" />
              </button>
            </div>
          </DialogHeader>

          {selectedAsset && (
            <div className="space-y-6">
              {/* Row 1: Name and Serial Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Asset Name</Label>
                  <Input
                    value={editData.name !== undefined ? editData.name : selectedAsset.name}
                    onChange={(e) => handleEditChange('name', e.target.value)}
                    placeholder={selectedAsset.name}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Serial Number</Label>
                  <Input
                    value={
                      editData.serialNumber !== undefined
                        ? editData.serialNumber
                        : selectedAsset.serialNumber
                    }
                    onChange={(e) => handleEditChange('serialNumber', e.target.value)}
                    placeholder={selectedAsset.serialNumber}
                  />
                </div>
              </div>

              {/* Row 2: Location and Branch */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={editData.location !== undefined ? editData.location : selectedAsset.location}
                    onChange={(e) => handleEditChange('location', e.target.value)}
                    placeholder={selectedAsset.location}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Input
                    value={editData.branch !== undefined ? editData.branch : selectedAsset.branch || ''}
                    onChange={(e) => handleEditChange('branch', e.target.value)}
                    placeholder={selectedAsset.branch || 'N/A'}
                  />
                </div>
              </div>

              {/* Row 3: Vendor */}
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Select
                  value={
                    editData.vendorId !== undefined
                      ? editData.vendorId.toString()
                      : selectedAsset.vendor?.id.toString() || 'none'
                  }
                  onValueChange={(val) => {
                    handleEditChange('vendorId', val === 'none' ? undefined : parseInt(val));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedAsset.vendor?.name || 'No vendor'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Vendor</SelectItem>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Row 4: Value and Purchase Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Value (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editData.value !== undefined ? editData.value : selectedAsset.value || 0}
                    onChange={(e) => handleEditChange('value', parseFloat(e.target.value))}
                    placeholder={selectedAsset.value?.toString() || '0'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Purchase Date</Label>
                  <Input
                    type="date"
                    value={editData.purchaseDate !== undefined ? editData.purchaseDate : selectedAsset.purchaseDate || ''}
                    onChange={(e) => handleEditChange('purchaseDate', e.target.value)}
                  />
                </div>
              </div>

              {/* Row 5: Installation Date and Manufacturer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Installation Date</Label>
                  <Input
                    type="date"
                    value={editData.installationDate !== undefined ? editData.installationDate : selectedAsset.installationDate || ''}
                    onChange={(e) => handleEditChange('installationDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Manufacturer</Label>
                  <Input
                    value={editData.manufacturer !== undefined ? editData.manufacturer : selectedAsset.manufacturer || ''}
                    onChange={(e) => handleEditChange('manufacturer', e.target.value)}
                    placeholder={selectedAsset.manufacturer || 'N/A'}
                  />
                </div>
              </div>

              {/* Row 6: Model and Cash Capacity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input
                    value={editData.model !== undefined ? editData.model : selectedAsset.model || ''}
                    onChange={(e) => handleEditChange('model', e.target.value)}
                    placeholder={selectedAsset.model || 'N/A'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cash Capacity (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editData.cashCapacity !== undefined ? editData.cashCapacity : selectedAsset.cashCapacity || 0}
                    onChange={(e) => handleEditChange('cashCapacity', parseFloat(e.target.value))}
                    placeholder={selectedAsset.cashCapacity?.toString() || '0'}
                  />
                </div>
              </div>

              {/* Row 7: Asset Status and Billing Month */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Asset Status</Label>
                  <Input
                    value={editData.assetStatus !== undefined ? editData.assetStatus : selectedAsset.assetStatus || ''}
                    onChange={(e) => handleEditChange('assetStatus', e.target.value)}
                    placeholder={selectedAsset.assetStatus || 'N/A'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Billing Month</Label>
                  <Input
                    value={editData.billingMonth !== undefined ? editData.billingMonth : selectedAsset.billingMonth || ''}
                    onChange={(e) => handleEditChange('billingMonth', e.target.value)}
                    placeholder={selectedAsset.billingMonth || 'N/A'}
                  />
                </div>
              </div>

              {/* Row 8: Billing Status and Pickup Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Billing Status</Label>
                  <Input
                    value={editData.billingStatus !== undefined ? editData.billingStatus : selectedAsset.billingStatus || ''}
                    onChange={(e) => handleEditChange('billingStatus', e.target.value)}
                    placeholder={selectedAsset.billingStatus || 'N/A'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pickup Date</Label>
                  <Input
                    type="date"
                    value={editData.pickupDate !== undefined ? editData.pickupDate : selectedAsset.pickupDate || ''}
                    onChange={(e) => handleEditChange('pickupDate', e.target.value)}
                  />
                </div>
              </div>

              {/* Row 8b: Delivery Date + Ageing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Delivery Date</Label>
                  <Input
                    type="date"
                    value={editData.deliveryDate !== undefined ? editData.deliveryDate : selectedAsset.deliveryDate || ''}
                    onChange={(e) => handleEditChange('deliveryDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ageing</Label>
                  <div className="flex items-center h-10 px-3 rounded-md border bg-muted text-sm">
                    {(() => {
                      const pickupStr = editData.pickupDate ?? selectedAsset.pickupDate;
                      const deliveryStr = editData.deliveryDate ?? selectedAsset.deliveryDate;
                      if (!pickupStr) return <span className="text-muted-foreground">N/A</span>;
                      const pickup = new Date(pickupStr);
                      const end = deliveryStr ? new Date(deliveryStr) : new Date();
                      const days = Math.floor((end.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24));
                      return deliveryStr
                        ? <span className="font-medium">{days} days</span>
                        : <span className="text-amber-600 font-medium">Not Delivered — {days} days ongoing</span>;
                    })()}
                  </div>
                </div>
              </div>

              {/* Row 8c: Amount Received */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount Received</Label>
                  <Select
                    value={editData.amountReceived !== undefined ? (editData.amountReceived || 'none') : (selectedAsset.amountReceived || 'none')}
                    onValueChange={(val) => handleEditChange('amountReceived', val === 'none' ? '' : val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not set</SelectItem>
                      <SelectItem value="Received">Received</SelectItem>
                      <SelectItem value="Not received">Not Received</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 9: Description */}
              <div className="space-y-2">
                <Label>Asset Description</Label>
                <Textarea
                  value={editData.notes !== undefined ? editData.notes : selectedAsset.notes || ''}
                  onChange={(e) => handleEditChange('notes', e.target.value)}
                  placeholder={selectedAsset.notes || 'No description'}
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDetail}
                  disabled={isUpdating}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  disabled={!hasChanges || isUpdating}
                  onClick={handleUpdateAsset}
                >
                  {isUpdating ? 'Updating...' : 'Update Asset'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedAsset?.name}</strong>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleDeleteAsset}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
