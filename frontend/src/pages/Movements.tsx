import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, Column } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useHighlight } from '@/hooks/useHighlight';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { movementService } from '@/services/movementService';
import { atmService } from '@/services/atmService';
import { Asset, AssetMovement } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Plus, ArrowRight, Filter, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const movementTypeLabels: Record<string, string> = {
  'INSTALLATION': 'Installation',
  'RELOCATION': 'Relocation',
  'MAINTENANCE': 'Maintenance',
  'DECOMMISSION': 'Decommission',
  'RETURN': 'Return',
};

export default function Movements() {
  const [movements, setMovements] = useState<AssetMovement[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMovement, setSelectedMovement] = useState<AssetMovement | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [editData, setEditData] = useState<Partial<AssetMovement>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  useHighlight();
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [fromLocationInput, setFromLocationInput] = useState<string>('');
  const [toLocationInput, setToLocationInput] = useState<string>('');
  const [expectedDeliveryInput, setExpectedDeliveryInput] = useState<string>('');
  const [docketInput, setDocketInput] = useState<string>('');
  const [businessGroupInput, setBusinessGroupInput] = useState<string>('');
  const [modeOfBillInput, setModeOfBillInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [businessGroupFilter, setBusinessGroupFilter] = useState<string>('all');
  
  // Get unique movement types from data
  const uniqueMovementTypes = useMemo(() => {
    const types = new Set(movements.map(m => m.movementType));
    return Array.from(types).sort();
  }, [movements]);

  // Get unique business groups from data
  const uniqueBusinessGroups = useMemo(() => {
    const groups = new Set(movements.map(m => m.businessGroup).filter(Boolean));
    return Array.from(groups).sort();
  }, [movements]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [fetchedMovements, fetchedAssets] = await Promise.all([
          movementService.getAllMovements(),
          atmService.getAssets(),
        ]);
        setMovements(fetchedMovements);
        setAssets(fetchedAssets);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExportMovements = () => {
    try {
      const exportData = filteredMovements.map((m) => ({
        'Asset Name': m.assetName || m.atm?.name || '-',
        'Serial Number': m.atm?.serialNumber || '-',
        'From Location': m.fromLocation || '-',
        'To Location': m.toLocation || '-',
        'Movement Type': m.movementType || '-',
        'Status': m.status || '-',
        'Initiated By': m.initiatedBy || '-',
        'Initiated Date': m.initiatedDate || '-',
        'Expected Delivery': m.expectedDelivery || '-',
        'Docket No': m.docketNo || '-',
        'Business Group': m.businessGroup || '-',
        'Mode of Bill': m.modeOfBill || '-',
        'Notes': (m as any).notes || '-',
        'Tracking Number': (m as any).trackingNumber || '-',
        'Created At': (m as any).createdAt || '-',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Movements');

      // Optional: set column widths
      worksheet['!cols'] = [
        { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 18 }, { wch: 20 },
      ];

      const date = new Date().toISOString().split('T')[0];
      const filename = `Movements_${date}.xlsx`;
      XLSX.writeFile(workbook, filename);
    } catch (e) {
      console.error('Failed to export movements', e);
    }
  };

  const handleOpenDetail = (movement: AssetMovement) => {
    setSelectedMovement(movement);
    setEditData({});
    setShowDetailPanel(true);
  };

  const handleCloseDetail = () => {
    setShowDetailPanel(false);
    setSelectedMovement(null);
    setEditData({});
  };

  const handleEditChange = (field: keyof AssetMovement, value: any) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateMovement = async () => {
    if (!selectedMovement) return;
    try {
      setIsUpdating(true);
      const payload: any = {
        atmId: editData.assetId ?? selectedMovement.assetId ?? selectedMovement.atm?.id,
        fromLocation: editData.fromLocation ?? selectedMovement.fromLocation,
        toLocation: editData.toLocation ?? selectedMovement.toLocation,
        movementType: editData.movementType ?? selectedMovement.movementType,
        initiatedBy: editData.initiatedBy ?? selectedMovement.initiatedBy ?? 'Manual',
        expectedDelivery: editData.expectedDelivery ?? selectedMovement.expectedDelivery ?? null,
        notes: editData.notes ?? selectedMovement['notes'] ?? '',
        docketNo: editData.docketNo ?? selectedMovement.docketNo,
        businessGroup: editData.businessGroup ?? selectedMovement.businessGroup,
        modeOfBill: editData.modeOfBill ?? selectedMovement.modeOfBill,
      };

      const updated = await movementService.updateMovement(selectedMovement.id, payload);
      // refresh list locally
      const refreshed = await movementService.getAllMovements();
      setMovements(refreshed);
      setSelectedMovement(updated);
      setEditData({});
      setShowDetailPanel(false);
      toast({ title: 'Success', description: 'Movement updated' });
    } catch (e) {
      console.error('Failed to update movement', e);
      toast({ title: 'Error', description: 'Failed to update movement', variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteMovement = async () => {
    if (!selectedMovement) return;
    if (!confirm('Are you sure you want to delete this movement?')) return;
    try {
      setIsDeleting(true);
      await movementService.deleteMovement(selectedMovement.id);
      setMovements((prev) => prev.filter((m) => m.id !== selectedMovement.id));
      setShowDetailPanel(false);
      setSelectedMovement(null);
      toast({ title: 'Success', description: 'Movement deleted' });
    } catch (e) {
      console.error('Failed to delete movement', e);
      toast({ title: 'Error', description: 'Failed to delete movement', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredMovements = movements.filter((movement) => {
    if (businessGroupFilter !== 'all' && (movement.businessGroup || '') !== businessGroupFilter) return false;
    if (typeFilter !== 'all' && movement.movementType !== typeFilter) return false;
    return true;
  });

  const columns: Column<AssetMovement>[] = [
    {
      key: 'assetName',
      header: 'Asset',
      render: (movement) => (
        <div>
          <p className="font-medium">{movement.assetName || movement.atm?.name || 'N/A'}</p>
          <p className="text-xs text-muted-foreground">{movement.atm?.serialNumber || 'N/A'}</p>
        </div>
      ),
    },
    {
      key: 'docketNo',
      header: 'Docket No',
      render: (movement) => movement.docketNo || '-',
    },
    {
      key: 'businessGroup',
      header: 'Business Group',
      render: (movement) => movement.businessGroup || '-',
    },
    {
      key: 'route',
      header: 'Route',
      render: (movement) => (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{movement.fromLocation}</span>
          <ArrowRight className="w-4 h-4 text-primary" />
          <span className="font-medium">{movement.toLocation}</span>
        </div>
      ),
    },
    {
      key: 'movementType',
      header: 'Type',
      render: (movement) => (
        <Badge variant="secondary">
          {movementTypeLabels[movement.movementType] || movement.movementType}
        </Badge>
      ),
    },
    // removed initiatedBy, initiatedDate, expectedDelivery per request
    {
      key: 'modeOfBill',
      header: 'Mode of Bill',
      render: (movement) => movement.modeOfBill || '-',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Movements"
        description="Track and manage asset transfers between locations"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleExportMovements()}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Movement
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>Create New Movement</DialogTitle>
                  <DialogDescription>
                    Initiate a new asset movement between locations.
                  </DialogDescription>
                </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="asset">Asset</Label>
                  <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={String(asset.id)}>
                          {asset.name} - {asset.serialNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Movement Type</Label>
                  <Select value={selectedType} onValueChange={setSelectedType} aria-label="movement-type-select">
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Site to Site">Site to Site</SelectItem>
                      <SelectItem value="Site to Warehouse">Site to Warehouse</SelectItem>
                      <SelectItem value="Warehouse to Site">Warehouse to Site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="from">From Location</Label>
                    <Input id="from" value={fromLocationInput} onChange={(e) => setFromLocationInput(e.target.value)} placeholder="Current location" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="to">To Location</Label>
                    <Input id="to" value={toLocationInput} onChange={(e) => setToLocationInput(e.target.value)} placeholder="Destination" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="delivery">Expected Delivery</Label>
                  <Input id="delivery" type="date" value={expectedDeliveryInput} onChange={(e) => setExpectedDeliveryInput(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="docket">Docket No</Label>
                  <Input id="docket" value={docketInput} onChange={(e) => setDocketInput(e.target.value)} placeholder="Docket number" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="businessGroup">Business Group</Label>
                  <Input id="businessGroup" value={businessGroupInput} onChange={(e) => setBusinessGroupInput(e.target.value)} placeholder="Business Group" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="modeOfBill">Mode of Bill</Label>
                  <Input id="modeOfBill" value={modeOfBillInput} onChange={(e) => setModeOfBillInput(e.target.value)} placeholder="Mode of Bill" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea id="notes" value={notesInput} onChange={(e) => setNotesInput(e.target.value)} placeholder="Additional notes..." rows={3} />
                </div>
              </div>
                <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={async () => {
                  // gather controlled form values
                  const assetId = selectedAssetId;
                  const type = selectedType;

                  if (!assetId) {
                    console.error('Please select an asset');
                    return;
                  }

                  try {
                    await movementService.createMovement({
                      atmId: Number(assetId),
                      fromLocation: fromLocationInput,
                      toLocation: toLocationInput,
                      movementType: type,
                      initiatedBy: 'Manual',
                      expectedDelivery: expectedDeliveryInput || null,
                      notes: notesInput || '',
                      docketNo: docketInput,
                      businessGroup: businessGroupInput,
                      modeOfBill: modeOfBillInput,
                    });
                    setIsDialogOpen(false);
                    // refresh
                    const refreshed = await movementService.getAllMovements();
                    setMovements(refreshed);
                  } catch (e) {
                    console.error('Create movement failed', e);
                  }
                }}>Create Movement</Button>
              </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg bg-card border border-border">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Movement Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {uniqueMovementTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {movementTypeLabels[type] || type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={businessGroupFilter} onValueChange={setBusinessGroupFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Business Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Business Groups</SelectItem>
            {uniqueBusinessGroups.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(typeFilter !== 'all' || statusFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTypeFilter('all');
              setStatusFilter('all');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <DataTable
        data={filteredMovements}
        columns={columns}
        isLoading={isLoading}
        searchKey="assetName"
        searchPlaceholder="Search movements..."
        onRowClick={handleOpenDetail}
      />

      {/* Movement Detail Dialog */}
      <Dialog open={showDetailPanel} onOpenChange={setShowDetailPanel}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <DialogTitle>{selectedMovement?.assetName || selectedMovement?.atm?.name}</DialogTitle>
                <DialogDescription>{selectedMovement?.atm?.serialNumber}</DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="destructive" onClick={handleDeleteMovement} disabled={isDeleting}>
                  Delete
                </Button>
              </div>
            </div>
          </DialogHeader>

          {selectedMovement && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>From</Label>
                  <Input value={editData.fromLocation ?? selectedMovement.fromLocation} onChange={(e) => handleEditChange('fromLocation', e.target.value)} />
                </div>
                <div>
                  <Label>To</Label>
                  <Input value={editData.toLocation ?? selectedMovement.toLocation} onChange={(e) => handleEditChange('toLocation', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Movement Type</Label>
                  <Select value={editData.movementType ?? selectedMovement.movementType} onValueChange={(v) => handleEditChange('movementType', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Site to Site">Site to Site</SelectItem>
                      <SelectItem value="Site to Warehouse">Site to Warehouse</SelectItem>
                      <SelectItem value="Warehouse to Site">Warehouse to Site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Expected Delivery</Label>
                  <Input type="date" value={String(editData.expectedDelivery ?? selectedMovement.expectedDelivery ?? '')} onChange={(e) => handleEditChange('expectedDelivery', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Docket No</Label>
                  <Input value={editData.docketNo ?? selectedMovement.docketNo ?? ''} onChange={(e) => handleEditChange('docketNo', e.target.value)} />
                </div>
                <div>
                  <Label>Business Group</Label>
                  <Input value={editData.businessGroup ?? selectedMovement.businessGroup ?? ''} onChange={(e) => handleEditChange('businessGroup', e.target.value)} />
                </div>
                <div>
                  <Label>Mode of Bill</Label>
                  <Input value={editData.modeOfBill ?? selectedMovement.modeOfBill ?? ''} onChange={(e) => handleEditChange('modeOfBill', e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea value={editData['notes'] ?? (selectedMovement as any).notes ?? ''} onChange={(e) => handleEditChange('notes', e.target.value)} rows={4} />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCloseDetail}>Close</Button>
                <Button onClick={handleUpdateMovement} disabled={isUpdating}>{isUpdating ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
