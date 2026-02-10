import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { dashboardService } from '@/services/dashboardService';
import { useEffect, useState } from 'react';

export function RiskTrendChart() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    dashboardService.getRiskTrend().then((res) => setData(res.data || res || [])).catch(() => setData([]));
  }, []);

  return (
    <div className="kpi-card h-[360px] animate-slide-up" style={{ animationDelay: '0.25s' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Risk Mitigation Trend</h3>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 text-success text-sm font-medium">
          ↓ 34% improved
        </div>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            domain={[0, 50]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: 'var(--shadow-lg)',
            }}
            formatter={(value: number) => [`${value}`, 'Risk Score']}
          />
          <ReferenceLine
            y={30}
            stroke="hsl(var(--warning))"
            strokeDasharray="5 5"
            label={{
              value: 'Threshold',
              position: 'right',
              fill: 'hsl(var(--warning))',
              fontSize: 11,
            }}
          />
          <Area
            type="monotone"
            dataKey="risk"
            stroke="hsl(var(--destructive))"
            strokeWidth={2}
            fill="url(#riskGradient)"
            dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 0, r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
