'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { formatDurationFromSecs } from '@/lib/utils/time'

interface TimeByProjectProps {
  data: { name: string; secs: number }[]
}

export function TimeByProject({ data }: TimeByProjectProps) {
  if (data.length === 0)
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Tiempo por proyecto
        </h3>
        <p className="text-sm text-muted-foreground text-center py-10">Sin datos</p>
      </div>
    )

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Tiempo por proyecto
      </h3>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 10 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
              tick={{ fontSize: 11, fill: '#888888' }}
              axisLine={false}
              tickLine={false}
            />
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
            <Bar dataKey="secs" fill="#00D4FF" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
