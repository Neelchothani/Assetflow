import { Badge } from '@/components/ui/badge';

type StatusType = 
  | 'pending' 
  | 'in-transit' 
  | 'delivered' 
  | 'active' 
  | 'inactive' 
  | 'idle' 
  | 'maintenance'
  | 'approved'
  | 'rejected'
  | 'retired';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; variant: string }> = {
  pending: { label: 'Pending', variant: 'pending' },
  'in-transit': { label: 'In Transit', variant: 'in-transit' },
  delivered: { label: 'Delivered', variant: 'delivered' },
  active: { label: 'Active', variant: 'active' },
  inactive: { label: 'Inactive', variant: 'destructive' },
  idle: { label: 'Idle', variant: 'idle' },
  maintenance: { label: 'Maintenance', variant: 'maintenance' },
  approved: { label: 'Approved', variant: 'delivered' },
  rejected: { label: 'Rejected', variant: 'maintenance' },
  retired: { label: 'Retired', variant: 'inactive' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  if (!config) {
    return (
      <Badge variant="secondary" className={className}>
        {status}
      </Badge>
    );
  }
  
  return (
    <Badge variant={config.variant as any} className={className}>
      {config.label}
    </Badge>
  );
}
