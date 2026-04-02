'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, CheckCircle2, Calendar, Sparkles, Zap, ChevronRight, Play, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUIStore } from '@/stores/uiStore'
import { IS_DEMO } from '@/lib/demo'

interface OnboardingProps {
  userId: string
  onComplete: () => void
}

const TOTAL_STEPS = 6 // 0-5

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.96,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
    scale: 0.96,
  }),
}

const iconPop = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 20, delay: 0.2 },
  },
}

const textUp = {
  hidden: { y: 20, opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, delay: 0.3 + i * 0.1, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

export function Onboarding({ userId, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const { openModal } = useUIStore()

  const markComplete = useCallback(async () => {
    if (!IS_DEMO) {
      const supabase = createClient()
      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', userId)
    }
    onComplete()
  }, [userId, onComplete])

  const next = () => {
    if (step < TOTAL_STEPS - 1) {
      setDirection(1)
      setStep((s) => s + 1)
    }
  }

  const skip = () => {
    markComplete()
  }

  const handleCreateTask = () => {
    markComplete()
    setTimeout(() => openModal('task-create'), 300)
  }

  const handleTalkToKira = () => {
    markComplete()
    // Navigate to chat
    window.location.href = '/chat'
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#080808]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[rgba(0,212,255,0.04)] blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md mx-auto px-6 flex flex-col items-center min-h-[70vh] justify-center">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center w-full"
          >
            {step === 0 && <StepWelcome />}
            {step === 1 && <StepDashboard />}
            {step === 2 && <StepTasks />}
            {step === 3 && <StepMeetings />}
            {step === 4 && <StepAI />}
            {step === 5 && (
              <StepReady
                onCreateTask={handleCreateTask}
                onTalkToKira={handleTalkToKira}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="absolute bottom-[10vh] flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <motion.div
              key={i}
              className="rounded-full"
              animate={{
                width: i === step ? 24 : 6,
                height: 6,
                backgroundColor: i === step ? '#00D4FF' : '#333',
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="absolute bottom-[4vh] flex items-center justify-between w-full px-2">
          <motion.button
            onClick={skip}
            className="text-[13px] text-[#555] hover:text-[#888] transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            Saltar
          </motion.button>

          {step < TOTAL_STEPS - 1 && (
            <motion.button
              onClick={next}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#00D4FF] text-[#080808] text-sm font-semibold"
              whileTap={{ scale: 0.93 }}
              whileHover={{ scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {step === 0 ? 'Empezar' : 'Siguiente'}
              <ChevronRight size={16} strokeWidth={2.5} />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ============================================
   Individual Steps
   ============================================ */

function StepWelcome() {
  return (
    <>
      {/* Animated ring */}
      <motion.div
        variants={iconPop}
        initial="hidden"
        animate="visible"
        className="relative mb-10"
      >
        <div className="w-28 h-28 rounded-full border-2 border-[#00D4FF]/30 flex items-center justify-center">
          <motion.div
            className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00D4FF]/20 to-[#8B5CF6]/20 flex items-center justify-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="text-3xl font-bold text-[#00D4FF] tracking-tight">K</span>
          </motion.div>
        </div>
        {/* Glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ boxShadow: ['0 0 20px rgba(0,212,255,0.15)', '0 0 40px rgba(0,212,255,0.25)', '0 0 20px rgba(0,212,255,0.15)'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      <motion.h1
        custom={0}
        variants={textUp}
        initial="hidden"
        animate="visible"
        className="text-2xl md:text-3xl font-bold text-foreground mb-3"
      >
        Bienvenido a KIRA
      </motion.h1>

      <motion.p
        custom={1}
        variants={textUp}
        initial="hidden"
        animate="visible"
        className="text-[15px] text-muted-foreground leading-relaxed max-w-xs"
      >
        Tu centro de operaciones inteligente.
        <br />
        Te guío en 1 minuto.
      </motion.p>
    </>
  )
}

function StepDashboard() {
  return (
    <>
      <motion.div
        variants={iconPop}
        initial="hidden"
        animate="visible"
        className="mb-10"
      >
        <div className="w-24 h-24 rounded-full bg-[#111] flex items-center justify-center">
          <Activity size={40} className="text-[#00D4FF]" />
        </div>
      </motion.div>

      <motion.h2
        custom={0}
        variants={textUp}
        initial="hidden"
        animate="visible"
        className="text-xl font-bold text-foreground mb-3"
      >
        Tu día, de un vistazo
      </motion.h2>

      <motion.p
        custom={1}
        variants={textUp}
        initial="hidden"
        animate="visible"
        className="text-[15px] text-muted-foreground leading-relaxed max-w-xs"
      >
        El anillo de progreso muestra tu tiempo operativo, meetings completados y tareas del día.
      </motion.p>

      <motion.div
        custom={2}
        variants={textUp}
        initial="hidden"
        animate="visible"
        className="mt-8 flex items-center gap-4"
      >
        {[
          { color: '#00D4FF', label: 'Operativa' },
          { color: '#8B5CF6', label: 'Meetings' },
          { color: '#22C55A', label: 'Tasks' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </motion.div>
    </>
  )
}

function StepTasks() {
  return (
    <>
      <motion.div
        variants={iconPop}
        initial="hidden"
        animate="visible"
        className="mb-10"
      >
        <div className="w-24 h-24 rounded-full bg-[#111] flex items-center justify-center">
          <Play size={40} className="text-[#22C55A]" fill="#22C55A" />
        </div>
      </motion.div>

      <motion.h2
        custom={0}
        variants={textUp}
        initial="hidden"
        animate="visible"
        className="text-xl font-bold text-foreground mb-3"
      >
        Tareas y Timer
      </motion.h2>

      <motion.p
        custom={1}
        variants={textUp}
        initial="hidden"
        animate="visible"
        className="text-[15px] text-muted-foreground leading-relaxed max-w-xs"
      >
        Crea tareas, asigna prioridades con la Matriz de Eisenhower, y usa el timer para trackear tu tiempo automáticamente.
      </motion.p>

      <motion.div
        custom={2}
        variants={textUp}
        initial="hidden"
        animate="visible"
        className="mt-6 flex flex-wrap justify-center gap-2"
      >
        {['Q1 · Urgente', 'Q2 · Importante', 'Q3 · Delegar', 'Q4 · Eliminar'].map((label, i) => (
          <span
            key={label}
            className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: ['rgba(255,68,68,0.12)', 'rgba(245,166,35,0.12)', 'rgba(0,212,255,0.12)', 'rgba(68,68,68,0.2)'][i],
              color: ['#FF4444', '#F5A623', '#00D4FF', '#888'][i],
            }}
          >
            {label}
          </span>
        ))}
      </motion.div>
    </>
  )
}

function StepMeetings() {
  return (
    <>
      <motion.div
        variants={iconPop}
        initial="hidden"
        animate="visible"
        className="mb-10"
      >
        <div className="w-24 h-24 rounded-full bg-[#111] flex items-center justify-center">
          <Calendar size={40} className="text-[#8B5CF6]" />
        </div>
      </motion.div>

      <motion.h2
        custom={0}
        variants={textUp}
        initial="hidden"
        animate="visible"
        className="text-xl font-bold text-foreground mb-3"
      >
        Meetings y Calendario
      </motion.h2>

      <motion.p
        custom={1}
        variants={textUp}
        initial="hidden"
        animate="visible"
        className="text-[15px] text-muted-foreground leading-relaxed max-w-xs"
      >
        Tus meetings de Google Calendar se sincronizan automáticamente. KIRA genera resúmenes y tareas desde las transcripciones.
      </motion.p>

      <motion.div
        custom={2}
        variants={textUp}
        initial="hidden"
        animate="visible"
        className="mt-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-[#111]"
      >
        <div className="w-2 h-2 rounded-full bg-[#22C55A] animate-pulse" />
        <span className="text-xs text-muted-foreground">Google Calendar conectado</span>
      </motion.div>
    </>
  )
}

function StepAI() {
  return (
    <>
      <motion.div
        variants={iconPop}
        initial="hidden"
        animate="visible"
        className="mb-10"
      >
        <div className="w-24 h-24 rounded-full bg-[#111] flex items-center justify-center">
          <Sparkles size={40} className="text-[#F5A623]" />
        </div>
      </motion.div>

      <motion.h2
        custom={0}
        variants={textUp}
        initial="hidden"
        animate="visible"
        className="text-xl font-bold text-foreground mb-3"
      >
        KIRA AI
      </motion.h2>

      <motion.p
        custom={1}
        variants={textUp}
        initial="hidden"
        animate="visible"
        className="text-[15px] text-muted-foreground leading-relaxed max-w-xs"
      >
        Habla con KIRA en lenguaje natural. Puede crear tareas, programar meetings, analizar tu calendario y aprender de ti.
      </motion.p>

      <motion.p
        custom={2}
        variants={textUp}
        initial="hidden"
        animate="visible"
        className="mt-4 text-[13px] text-[#F5A623]/80 italic"
      >
        KIRA tiene memoria — cuanto más la uses, mejor te conoce.
      </motion.p>
    </>
  )
}

function StepReady({ onCreateTask, onTalkToKira }: { onCreateTask: () => void; onTalkToKira: () => void }) {
  return (
    <>
      <motion.div
        variants={iconPop}
        initial="hidden"
        animate="visible"
        className="mb-10"
      >
        <motion.div
          className="w-28 h-28 rounded-full bg-gradient-to-br from-[#00D4FF]/20 to-[#22C55A]/20 flex items-center justify-center"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <CheckCircle2 size={48} className="text-[#22C55A]" />
        </motion.div>
      </motion.div>

      <motion.h2
        custom={0}
        variants={textUp}
        initial="hidden"
        animate="visible"
        className="text-xl font-bold text-foreground mb-3"
      >
        Todo listo
      </motion.h2>

      <motion.p
        custom={1}
        variants={textUp}
        initial="hidden"
        animate="visible"
        className="text-[15px] text-muted-foreground leading-relaxed max-w-xs mb-8"
      >
        Tu primer paso: crea una tarea o habla con KIRA.
      </motion.p>

      <motion.div
        custom={2}
        variants={textUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col sm:flex-row gap-3 w-full max-w-xs"
      >
        <motion.button
          onClick={onCreateTask}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#00D4FF] text-[#080808] text-sm font-semibold"
          whileTap={{ scale: 0.93 }}
          whileHover={{ scale: 1.03 }}
        >
          <Zap size={16} />
          Crear tarea
        </motion.button>

        <motion.button
          onClick={onTalkToKira}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#171717] text-foreground text-sm font-semibold border border-[#242424]"
          whileTap={{ scale: 0.93 }}
          whileHover={{ scale: 1.03 }}
        >
          <MessageCircle size={16} />
          Hablar con KIRA
        </motion.button>
      </motion.div>
    </>
  )
}
