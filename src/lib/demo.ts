export const IS_DEMO = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co'

// Generate a simple UUID for demo mode
export function demoId(): string {
  return crypto.randomUUID()
}
