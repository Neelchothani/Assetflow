import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { dashboardService } from '@/services/dashboardService';
import { useEffect, useState } from 'react';

const COLORS = [
  'hsl(167, 76%, 40%)',  // teal
  'hsl(38, 92%, 50%)',   // amber
  'hsl(0, 72%, 51%)',    // red
  'hsl(217, 90%, 61%)',  // blue
  'hsl(281, 89%, 63%)',  // violet - for "Others"
];

export function AssetDistributionChart() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    dashboardService.getAssetDistribution().then((res) => {
      const allData = res.data || res || [];
      // Filter out items with 0 value
      const filteredData = allData.filter((item: any) => item.value > 0);
      
      // Sort by value descending and keep top 4, rest as "Others"
      filteredData.sort((a: any, b: any) => (b.value || 0) - (a.value || 0));
      
      const topItems = filteredData.slice(0, 4);
      const othersValue = filteredData.slice(4).reduce((sum: number, item: any) => sum + (item.value || 0), 0);
      
      const finalData = othersValue > 0 
        ? [...topItems, { name: 'Others', value: othersValue }]
        : topItems;
      
      setData(finalData);
    }).catch(() => setData([]));
  }, []);

  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);

  return (
    <div className="kpi-card h-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
      <h3 className="text-lg font-semibold mb-4">Asset Distribution</h3>
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={data}
            cx="40%"
            cy="45%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: 'var(--shadow-lg)',
            }}
            formatter={(value: number) => [`${value} assets`, '']}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            wrapperStyle={{ paddingLeft: '20px' }}
            formatter={(value, entry: any) => (
              <span className="text-sm text-foreground">
                {value} ({Math.round((entry.payload.value / total) * 100)}%)
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
