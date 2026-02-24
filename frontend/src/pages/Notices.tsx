import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, Bell, AlertTriangle, Info, CheckCircle, Loader2, Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { noticeService, NoticeResponse, InvoiceStatus, NoticePriority } from '@/services/noticeService';

const PRIORITY_CONFIG: Record<NoticePriority, {
  label: string;
  borderColor: string;
  iconColor: string;
  badgeClass: string;
  icon: React.FC<{ className?: string }>;
}> = {
  info:     { label: 'Info',     borderColor: 'border-l-blue-500',  iconColor: 'text-blue-400',  badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30',   icon: Info },
  warning:  { label: 'Warning',  borderColor: 'border-l-amber-500', iconColor: 'text-amber-400', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: AlertTriangle },
  critical: { label: 'Critical', borderColor: 'border-l-red-500',   iconColor: 'text-red-400',   badgeClass: 'bg-red-500/10 text-red-400 border-red-500/30',     icon: AlertTriangle },
  resolved: { label: 'Resolved', borderColor: 'border-l-green-500', iconColor: 'text-green-400', badgeClass: 'bg-green-500/10 text-green-400 border-green-500/30', icon: CheckCircle },
};

const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, { label: string; badgeClass: string }> = {
  PENDING:   { label: 'Pending',           badgeClass: 'bg-muted text-muted-foreground border-border' },
  RAISED:    { label: 'Invoice Raised',     badgeClass: 'bg-green-500/15 text-green-400 border-green-500/30' },
  NOT_RAISED: { label: 'Invoice Not Raised', badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

type InvoiceTab = 'ALL' | 'RAISED' | 'NOT_RAISED';

export default function Notices() {
  const [notices, setNotices] = useState<NoticeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<NoticeResponse | null>(null);
  const [flushConfirmTab, setFlushConfirmTab] = useState<'ALL' | InvoiceStatus | null>(null);
  const [invoiceTab, setInvoiceTab] = useState<InvoiceTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const { toast } = useToast();

  const loadNotices = useCallback(async () => {
    try {
      const data = await noticeService.getAll();
      setNotices(data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load notices.', variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await noticeService.syncDelivery();
      } catch {
        // sync is best-effort
      }
      await loadNotices();
      setLoading(false);
    };
    init();
  }, [loadNotices]);

  const handleInvoiceStatus = async (id: number, status: InvoiceStatus) => {
    setUpdatingId(id);
    try {
      await noticeService.updateInvoiceStatus(id, status);
      await loadNotices();
    } catch {
      toast({ title: 'Error', description: 'Failed to update invoice status.', variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await noticeService.deleteNotice(deleteTarget.id);
      toast({ title: 'Deleted', description: `Notice "${deleteTarget.title}" has been removed.` });
      setDeleteTarget(null);
      await loadNotices();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete notice.', variant: 'destructive' });
    }
  };

  const handleFlush = async () => {
    if (!flushConfirmTab) return;
    try {
      if (flushConfirmTab === 'ALL') {
        await noticeService.flushAll();
        toast({ title: 'Flushed', description: 'All notices have been deleted.' });
      } else {
        await noticeService.flushByStatus(flushConfirmTab);
        const label = INVOICE_STATUS_CONFIG[flushConfirmTab].label;
        toast({ title: 'Flushed', description: `All "${label}" notices have been deleted.` });
      }
      setFlushConfirmTab(null);
      setInvoiceTab('ALL');
      await loadNotices();
    } catch {
      toast({ title: 'Error', description: 'Failed to flush notices.', variant: 'destructive' });
    }
  };

  const filteredNotices = notices.filter((notice) => {
    const matchesTab = invoiceTab === 'ALL' || notice.invoiceStatus === invoiceTab;
    const matchesSearch =
      !searchQuery ||
      notice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notice.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notices"
        description="Company-wide notices and invoice alerts"
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Flush Confirmation */}
      <AlertDialog open={!!flushConfirmTab} onOpenChange={(open) => !open && setFlushConfirmTab(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Flush Notices</AlertDialogTitle>
            <AlertDialogDescription>
              {flushConfirmTab === 'ALL'
                ? 'This will permanently delete ALL notices. This cannot be undone.'
                : `This will permanently delete all "${flushConfirmTab ? INVOICE_STATUS_CONFIG[flushConfirmTab as InvoiceStatus].label : ''}" notices. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFlush} className="bg-red-600 hover:bg-red-700">
              Flush
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invoice Tab Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg bg-card border border-border">
        <Bell className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search notices..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-[220px]"
        />

        {/* Tab buttons */}
        <div className="flex items-center gap-1 ml-2">
          <Button
            variant={invoiceTab === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setInvoiceTab('ALL')}
          >
            All
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant={invoiceTab === 'RAISED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInvoiceTab('RAISED')}
              className={invoiceTab === 'RAISED' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              Invoices Raised
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
              title="Flush all Invoices Raised notices"
              onClick={() => setFlushConfirmTab('RAISED')}
            >
              <Trash className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={invoiceTab === 'NOT_RAISED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInvoiceTab('NOT_RAISED')}
              className={invoiceTab === 'NOT_RAISED' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              Invoices Not Raised
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
              title="Flush all Invoices Not Raised notices"
              onClick={() => setFlushConfirmTab('NOT_RAISED')}
            >
              <Trash className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {filteredNotices.length} notice{filteredNotices.length !== 1 ? 's' : ''}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-300 hover:bg-red-50"
            onClick={() => setFlushConfirmTab('ALL')}
          >
            <Trash className="w-3.5 h-3.5 mr-1.5" />
            Flush All
          </Button>
        </div>
      </div>

      {/* Notices List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading notices...</span>
        </div>
      ) : filteredNotices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <Bell className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-lg font-medium">No notices found</p>
          <p className="text-sm">Post a new notice using the button above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotices.map((notice) => {
            const priority = (notice.priority || 'info') as NoticePriority;
            const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.info;
            const Icon = cfg.icon;
            const isExpired = notice.expiryDate && new Date(notice.expiryDate) < new Date();
            const invoiceStatusCfg = INVOICE_STATUS_CONFIG[notice.invoiceStatus] ?? INVOICE_STATUS_CONFIG.PENDING;
            const isUpdating = updatingId === notice.id;

            return (
              <div
                key={notice.id}
                className={`rounded-lg border border-border border-l-4 ${cfg.borderColor} bg-card p-5 flex gap-4 items-start shadow-sm ${isExpired ? 'opacity-50' : ''}`}
              >
                <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${cfg.iconColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-base">{notice.title}</span>
                    <Badge variant="outline" className={`text-xs border ${cfg.badgeClass}`}>
                      {cfg.label}
                    </Badge>
                    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${invoiceStatusCfg.badgeClass}`}>
                      {invoiceStatusCfg.label}
                    </span>
                    {notice.isAutoGenerated && (
                      <Badge variant="secondary" className="text-xs">
                        System
                      </Badge>
                    )}
                    {isExpired && (
                      <Badge variant="secondary" className="text-xs">
                        Expired
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed mb-3">{notice.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs opacity-75 mb-3">
                    <span>Posted by <strong>{notice.createdBy}</strong></span>
                    <span>Date: {new Date(notice.createdAt).toLocaleDateString()}</span>
                    {notice.expiryDate && (
                      <span>Expires: {new Date(notice.expiryDate).toLocaleDateString()}</span>
                    )}
                    {notice.atmName && (
                      <span>ATM: <strong>{notice.atmName}</strong>{notice.atmSerialNumber ? ` (${notice.atmSerialNumber})` : ''}</span>
                    )}
                  </div>

                  {/* Invoice status action buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant={notice.invoiceStatus === 'RAISED' ? 'default' : 'outline'}
                      className={notice.invoiceStatus === 'RAISED'
                        ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                        : 'border-green-500/50 text-green-400 hover:bg-green-500/10 hover:border-green-500'}
                      disabled={isUpdating}
                      onClick={() => handleInvoiceStatus(notice.id, 'RAISED')}
                    >
                      {isUpdating && notice.invoiceStatus !== 'RAISED' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                      Invoice Raised
                    </Button>
                    <Button
                      size="sm"
                      variant={notice.invoiceStatus === 'NOT_RAISED' ? 'default' : 'outline'}
                      className={notice.invoiceStatus === 'NOT_RAISED'
                        ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                        : 'border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500'}
                      disabled={isUpdating}
                      onClick={() => handleInvoiceStatus(notice.id, 'NOT_RAISED')}
                    >
                      {isUpdating && notice.invoiceStatus !== 'NOT_RAISED' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                      Invoice Not Raised
                    </Button>
                    {notice.invoiceStatus !== 'PENDING' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground"
                        disabled={isUpdating}
                        onClick={() => handleInvoiceStatus(notice.id, 'PENDING')}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setDeleteTarget(notice)}
                  className="p-1.5 rounded hover:bg-muted transition-colors shrink-0 text-muted-foreground hover:text-foreground"
                  title="Delete notice"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
