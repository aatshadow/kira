// OpenJarvis types for KIRA integration

export interface SSEEvent {
  event?: string
  data: string
}

export interface JarvisToolCall {
  id: string
  tool: string
  arguments: string
  status: 'running' | 'success' | 'error'
  result?: string
  latency?: number
}

export interface JarvisTokenUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export interface JarvisTelemetry {
  engine?: string
  model_id?: string
  tokens_per_sec?: number
  ttft_ms?: number
  total_ms?: number
  complexity_score?: number
  complexity_tier?: string
  suggested_max_tokens?: number
}

export interface JarvisMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  toolCalls?: JarvisToolCall[]
  usage?: JarvisTokenUsage
  telemetry?: JarvisTelemetry
}

export interface JarvisConversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  model: string
  messages: JarvisMessage[]
}

export interface JarvisStreamState {
  isStreaming: boolean
  phase: string
  elapsedMs: number
  activeToolCalls: JarvisToolCall[]
  content: string
}

export interface JarvisModelInfo {
  id: string
  object: string
  created: number
  owned_by: string
}

export interface JarvisProviderSavings {
  provider: string
  label: string
  input_cost: number
  output_cost: number
  total_cost: number
  energy_wh: number
  energy_joules: number
  flops: number
}

export interface JarvisSavingsData {
  total_calls: number
  total_prompt_tokens: number
  total_completion_tokens: number
  total_tokens: number
  local_cost: number
  per_provider: JarvisProviderSavings[]
  token_counting_version?: number
}

export interface JarvisServerInfo {
  model: string
  agent: string | null
  engine: string
}

export interface JarvisManagedAgent {
  id: string
  name: string
  agent_type: string
  config: Record<string, unknown>
  status: 'idle' | 'running' | 'paused' | 'error' | 'archived'
  summary_memory: string
  created_at: number
  updated_at: number
  total_runs?: number
  total_cost?: number
  total_tokens?: number
  last_run_at?: number | null
  budget?: number
  learning_enabled?: boolean
  current_activity?: string
}
