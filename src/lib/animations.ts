import type { Variants, Transition } from 'framer-motion'

// --- Variant presets ---

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } },
}

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const },
  },
}

// --- Transition presets ---

export const kiraSpring: Transition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
}

// --- Spatial / Control Center variants ---

export const floatUp: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 260, damping: 24 },
  },
}

export const orbReveal: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 200, damping: 20, delay: 0.3 },
  },
}

export const bentoStagger: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.2 },
  },
}

export const hoverFloat = {
  y: -4,
  transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
}

export const tapBounce = {
  scale: 0.95,
  transition: { type: 'spring' as const, stiffness: 400, damping: 15 },
}

// --- Interaction presets ---

export const tapScale = { scale: 0.97 }
export const tapScaleSmall = { scale: 0.95 }
