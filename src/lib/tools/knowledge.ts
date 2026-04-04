import { createClient } from '@/lib/supabase/server'

export interface KnowledgeResult {
  memories: Array<{ category: string; content: string }>
  messages: Array<{ role: string; content: string; conversation_title: string }>
}

export async function queryKnowledge(query: string, userId: string): Promise<KnowledgeResult> {
  const supabase = await createClient()

  // Search memories by text match
  const { data: memories } = await supabase
    .from('kira_memory')
    .select('category, content')
    .eq('user_id', userId)
    .or(`content.ilike.%${query}%`)
    .order('updated_at', { ascending: false })
    .limit(15)

  // Search past chat messages
  const { data: messages } = await supabase
    .from('chat_messages')
    .select(`
      role, content,
      chat_conversations!inner(title)
    `)
    .eq('user_id', userId)
    .ilike('content', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(10)

  return {
    memories: memories || [],
    messages: (messages || []).map((m: Record<string, unknown>) => ({
      role: m.role as string,
      content: (m.content as string).slice(0, 500),
      conversation_title: ((m.chat_conversations as Record<string, string>)?.title) || 'Unknown',
    })),
  }
}
