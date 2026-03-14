'use client'

interface ProductivityHeatmapProps {
  data: { day: number; hour: number; secs: number }[]
}

const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const hours = Array.from({ length: 24 }, (_, i) => i)

export function ProductivityHeatmap({ data }: ProductivityHeatmapProps) {
  const maxSecs = Math.max(...data.map((d) => d.secs), 1)

  const getOpacity = (day: number, hour: number) => {
    const entry = data.find((d) => d.day === day && d.hour === hour)
    if (!entry) return 0
    return Math.max(0.1, entry.secs / maxSecs)
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Mapa de productividad
      </h3>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="flex gap-px ml-10 mb-1">
            {hours.map((h) => (
              <div key={h} className="flex-1 text-center text-[9px] text-muted-foreground">
                {h % 3 === 0 ? `${h}h` : ''}
              </div>
            ))}
          </div>
          {days.map((dayLabel, dayIdx) => (
            <div key={dayLabel} className="flex items-center gap-px mb-px">
              <span className="w-9 text-[10px] text-muted-foreground text-right pr-2">
                {dayLabel}
              </span>
              {hours.map((hour) => {
                const opacity = getOpacity(dayIdx, hour)
                return (
                  <div
                    key={hour}
                    className="flex-1 h-4 rounded-sm"
                    style={{
                      backgroundColor:
                        opacity > 0
                          ? `rgba(0, 212, 255, ${opacity})`
                          : 'rgba(255,255,255,0.03)',
                    }}
                    title={`${dayLabel} ${hour}:00`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
