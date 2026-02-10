import { Badge } from '@/components/ui/badge';
import { movementService } from '@/services/movementService';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

export function RecentMovements() {
  const [recentMovements, setRecentMovements] = useState<any[]>([]);

  useEffect(() => {
    movementService.getRecentMovements(4).then((data) => setRecentMovements(data)).catch(() => setRecentMovements([]));
  }, []);

  return (
    <div className="kpi-card animate-slide-up" style={{ animationDelay: '0.3s' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Movements</h3>
        <a href="/movements" className="text-sm text-primary hover:underline">
          View all
        </a>
      </div>
      <div className="space-y-4">
        {recentMovements.map((movement) => (
          <div
            key={movement.id}
            className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{movement.assetName}</p>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                <span className="truncate">{movement.fromLocation}</span>
                <ArrowRight className="w-3 h-3 shrink-0" />
                <span className="truncate">{movement.toLocation}</span>
              </div>
            </div>
            {movement.status?.toLowerCase() !== 'pending' && (
              <Badge
                variant={
                  movement.status?.toLowerCase() === 'delivered'
                    ? 'delivered'
                    : movement.status?.toLowerCase() === 'in-transit'
                    ? 'in-transit'
                    : 'pending'
                }
                className="ml-2 shrink-0"
              >
                {movement.status?.replace('-', ' ')}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
