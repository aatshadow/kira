'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, DollarSign, Activity, Clock, Cpu, BarChart3 } from 'lucide-react'
import { useJarvisStore } from '@/stores/jarvisStore'
import { fetchJarvisSavings, fetchJarvisEnergy, fetchJarvisTelemetryStats } from '@/lib/jarvis/api'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  color: string
}

function StatCard({ icon, label, value, sub, color }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-colors"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, color }}>
          {icon}
        </div>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </motion.div>
  )
}

export function JarvisDashboard() {
  const savings = useJarvisStore((s) => s.savings)
  const setSavings = useJarvisStore((s) => s.setSavings)
  const [energy, setEnergy] = useState<Record<string, unknown> | null>(null)
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    fetchJarvisSavings().then(setSavings).catch(() => {})
    fetchJarvisEnergy().then(setEnergy).catch(() => {})
    fetchJarvisTelemetryStats().then(setStats).catch(() => {})
  }, [setSavings])

  const totalCost = savings?.per_provider?.reduce((s, p) => s + p.total_cost, 0) ?? 0
  const totalEnergy = savings?.per_provider?.reduce((s, p) => s + p.energy_wh, 0) ?? 0

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Dashboard</h2>
        <p className="text-xs text-muted-foreground">Local inference metrics and cloud savings</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Activity size={14} />}
          label="Total Calls"
          value={String(savings?.total_calls ?? 0)}
          color="#00D4FF"
        />
        <StatCard
          icon={<BarChart3 size={14} />}
          label="Tokens"
          value={savings?.total_tokens ? `${(savings.total_tokens / 1000).toFixed(1)}k` : '0'}
          sub={`${savings?.total_prompt_tokens ?? 0} in / ${savings?.total_completion_tokens ?? 0} out`}
          color="#8B5CF6"
        />
        <StatCard
          icon={<DollarSign size={14} />}
          label="Cloud Cost Saved"
          value={`$${totalCost.toFixed(2)}`}
          sub="vs cloud providers"
          color="#10B981"
        />
        <StatCard
          icon={<Zap size={14} />}
          label="Energy"
          value={totalEnergy > 0 ? `${totalEnergy.toFixed(1)} Wh` : '—'}
          sub="estimated usage"
          color="#F59E0B"
        />
      </div>

      {/* Per-provider breakdown */}
      {savings?.per_provider && savings.per_provider.length > 0 && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Cost Comparison vs Cloud</h3>
          <div className="space-y-3">
            {savings.per_provider.map((p) => (
              <div key={p.provider} className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-foreground">{p.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{p.provider}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono text-emerald-400">${p.total_cost.toFixed(4)}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">saved</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Energy & telemetry raw data */}
      {(energy || stats) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {energy && (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                <Zap size={12} className="inline mr-1" />
                Energy Monitor
              </h3>
              <pre className="text-[11px] text-muted-foreground font-mono overflow-auto max-h-40">
                {JSON.stringify(energy, null, 2)}
              </pre>
            </div>
          )}
          {stats && (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                <Cpu size={12} className="inline mr-1" />
                Telemetry Stats
              </h3>
              <pre className="text-[11px] text-muted-foreground font-mono overflow-auto max-h-40">
                {JSON.stringify(stats, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
