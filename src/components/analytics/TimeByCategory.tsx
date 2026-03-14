'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatDurationFromSecs } from '@/lib/utils/time'

interface TimeByCategoryProps {
  data: { name: string; secs: number }[]
}

const COLORS = ['#00D4FF', '#0096FF', '#22C55A', '#F5A623', '#FF4444', '#888888', '#6366f1', '#ec4899']

export function TimeByCategory({ data }: TimeByCategoryProps) {
  if (data.length === 0)
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Tiempo por categoría
        </h3>
        <p className="text-sm text-muted-foreground text-center py-10">Sin datos</p>
      </div>
    )

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Tiempo por categoría
      </h3>
      <div className="flex items-center gap-6">
        <div className="w-[180px] h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
                dataKey="secs"
                nameKey="name"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatDurationFromSecs(Number(value))}
                contentStyle={{
                  background: '#0F0F0F',
                  border: '1px solid #242424',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                itemStyle={{ color: '#F0F0F0' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2">
          {data.map((item, i) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-foreground">{item.name}</span>
              </div>
              <span className="text-muted-foreground font-mono">
                {formatDurationFromSecs(item.secs)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
