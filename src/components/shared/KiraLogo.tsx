'use client'

import { useRef, useEffect, useMemo } from 'react'

interface KiraLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  animate?: boolean
}

const SIZES = { sm: 24, md: 40, lg: 64, xl: 80 }

interface Node {
  baseX: number
  baseY: number
  radius: number
  color: string
  freqX: number
  freqY: number
  ampX: number
  ampY: number
  phase: number
}

function createNodes(size: number): Node[] {
  const cx = size / 2
  const cy = size / 2
  const spread = size * 0.32

  // Generate nodes in a roughly circular pattern
  const nodes: Node[] = []
  const count = 10
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (i % 2 === 0 ? 0.3 : -0.2)
    const dist = spread * (0.4 + (i % 3) * 0.25)
    const x = cx + Math.cos(angle) * dist
    const y = cy + Math.sin(angle) * dist
    const isCyan = i % 3 !== 2
    nodes.push({
      baseX: x,
      baseY: y,
      radius: i === 0 ? size * 0.04 : size * 0.022 + (i % 2) * size * 0.008,
      color: isCyan ? '#00D4FF' : '#8B5CF6',
      freqX: 0.3 + i * 0.15,
      freqY: 0.4 + i * 0.12,
      ampX: size * 0.018 + (i % 3) * size * 0.008,
      ampY: size * 0.015 + (i % 2) * size * 0.01,
      phase: i * 0.7,
    })
  }

  // Central bright node
  nodes[0] = {
    ...nodes[0],
    baseX: cx,
    baseY: cy,
    radius: size * 0.045,
    color: '#00D4FF',
    ampX: size * 0.006,
    ampY: size * 0.006,
  }

  return nodes
}

function getConnections(nodes: Node[], size: number): [number, number][] {
  const maxDist = size * 0.45
  const conns: [number, number][] = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].baseX - nodes[j].baseX
      const dy = nodes[i].baseY - nodes[j].baseY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < maxDist) {
        conns.push([i, j])
      }
    }
  }
  return conns
}

export function KiraLogo({ size = 'md', className = '', animate = true }: KiraLogoProps) {
  const px = SIZES[size]
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  const nodes = useMemo(() => createNodes(px), [px])
  const connections = useMemo(() => getConnections(nodes, px), [nodes, px])

  useEffect(() => {
    if (!animate) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // HiDPI support
    const dpr = window.devicePixelRatio || 1
    canvas.width = px * dpr
    canvas.height = px * dpr
    ctx.scale(dpr, dpr)

    let startTime = performance.now()

    const draw = (now: number) => {
      const t = (now - startTime) / 1000

      ctx.clearRect(0, 0, px, px)

      // Calculate current node positions
      const positions = nodes.map((n) => ({
        x: n.baseX + Math.sin(t * n.freqX + n.phase) * n.ampX,
        y: n.baseY + Math.cos(t * n.freqY + n.phase) * n.ampY,
        radius: n.radius,
        color: n.color,
      }))

      // Draw connections
      for (const [i, j] of connections) {
        const a = positions[i]
        const b = positions[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const maxDist = px * 0.45
        const opacity = Math.max(0, 1 - dist / maxDist) * 0.3 * (0.6 + 0.4 * Math.sin(t * 0.8 + i + j))

        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = `rgba(0, 212, 255, ${opacity})`
        ctx.lineWidth = px * 0.008
        ctx.stroke()
      }

      // Draw nodes
      for (const p of positions) {
        // Glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3)
        gradient.addColorStop(0, p.color + '40')
        gradient.addColorStop(1, p.color + '00')
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()

        // Core
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [animate, px, nodes, connections])

  if (!animate) {
    // Static SVG fallback for SSR
    return (
      <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} className={className}>
        {connections.map(([i, j], idx) => (
          <line
            key={idx}
            x1={nodes[i].baseX}
            y1={nodes[i].baseY}
            x2={nodes[j].baseX}
            y2={nodes[j].baseY}
            stroke="rgba(0,212,255,0.2)"
            strokeWidth={px * 0.008}
          />
        ))}
        {nodes.map((n, i) => (
          <circle key={i} cx={n.baseX} cy={n.baseY} r={n.radius} fill={n.color} />
        ))}
      </svg>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      width={px}
      height={px}
      className={className}
      style={{ width: px, height: px }}
    />
  )
}
