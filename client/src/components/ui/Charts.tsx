import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts';
export function DailyChart({ data }: { data: { label: string; matches: number }[] }) {
  return (
    <div className="chart" role="img" aria-label="Completed matches by day">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 12, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="matchGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2c9a68" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#2c9a68" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e7ede9" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
            dy={10}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #DDE7E1' }} />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="matches"
            name="Matches"
            stroke="#178055"
            strokeWidth={3}
            fill="url(#matchGradient)"
            dot={{ r: 4, fill: '#fff', stroke: '#178055', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function UsageChart({ data }: { data: { name: string; matches: number }[] }) {
  return (
    <div className="chart" role="img" aria-label="Completed matches by court">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 14, right: 10, left: -22, bottom: 14 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e7ede9" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            interval={0}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickFormatter={(value) => value.replace(' Court', '').replace(' Arena', '')}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #DDE7E1' }} />
          <Bar
            isAnimationActive={false}
            dataKey="matches"
            name="Matches"
            fill="#279165"
            radius={[5, 5, 0, 0]}
            maxBarSize={38}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function HourChart({ data }: { data: { label: string; matches: number }[] }) {
  return (
    <div className="chart" role="img" aria-label="Completed matches by playing hour">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 14, right: 10, left: -22, bottom: 4 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e7ede9" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <Tooltip />
          <Bar
            isAnimationActive={false}
            dataKey="matches"
            name="Matches"
            fill="#12372A"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
