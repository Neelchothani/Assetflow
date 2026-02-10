import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { vendorService } from '@/services/vendorService';
import { useEffect, useState } from 'react';

export function VendorAllocationChart() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    vendorService.getAllVendors().then((vendors) => {
      // Transform vendor data into a chart-ready format
      // Each vendor becomes a data point with their allocated assets
      const chartData = vendors
        .map((vendor: any) => ({
          name: vendor.name,
          assets: vendor.assetsAllocated || 0,
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      setData(chartData);
    }).catch(() => setData([]));
  }, []);

  return (
    <div className="kpi-card h-[360px] animate-slide-up" style={{ animationDelay: '0.2s' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Vendor-wise Asset Allocation</h3>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: 'var(--shadow-lg)',
            }}
            formatter={(value: number) => [`${value} assets`, 'Allocated']}
          />
          <Line
            type="monotone"
            dataKey="assets"
            stroke="hsl(234, 89%, 63%)"
            strokeWidth={2}
            dot={{ fill: 'hsl(234, 89%, 63%)', r: 4 }}
            activeDot={{ r: 6 }}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
