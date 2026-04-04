import { executeWebSearch } from './web-search'
import { executeGetUrlContent } from './url-content'
import { executeCode } from './code-execution'
import { queryKnowledge } from './knowledge'
import { checkMacStatus, delegateToMac } from './mac-bridge'

export interface ToolResult {
  content: string
  error?: boolean
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  userId: string
): Promise<ToolResult> {
  switch (name) {
    case 'web_search': {
      const { results, error } = await executeWebSearch(input.query as string, userId)
      if (error) return { content: `Search error: ${error}`, error: true }
      if (results.length === 0) return { content: 'No results found.' }
      const formatted = results
        .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.snippet}`)
        .join('\n\n')
      return { content: formatted }
    }

    case 'get_url_content': {
      const { content, error } = await executeGetUrlContent(input.url as string)
      if (error) return { content: `Fetch error: ${error}`, error: true }
      return { content: content || 'Empty page.' }
    }

    case 'execute_code': {
      const result = await executeCode(input.code as string, (input.language as string) || 'python', userId)
      if (result.error) return { content: `Execution error: ${result.error}`, error: true }
      const parts: string[] = []
      if (result.stdout) parts.push(`Output:\n${result.stdout}`)
      if (result.stderr) parts.push(`Stderr:\n${result.stderr}`)
      return { content: parts.join('\n\n') || 'Code executed with no output.' }
    }

    case 'query_knowledge': {
      const { memories, messages } = await queryKnowledge(input.query as string, userId)
      const parts: string[] = []
      if (memories.length > 0) {
        parts.push('**Memories:**\n' + memories.map(m => `- [${m.category}] ${m.content}`).join('\n'))
      }
      if (messages.length > 0) {
        parts.push('**Past conversations:**\n' + messages.map(m => `- (${m.conversation_title}) ${m.role}: ${m.content}`).join('\n'))
      }
      return { content: parts.join('\n\n') || 'No relevant knowledge found.' }
    }

    case 'check_mac_status': {
      const status = await checkMacStatus(userId)
      return {
        content: status.online
          ? `Mac is ONLINE. Capabilities: ${JSON.stringify(status.capabilities || {})}`
          : 'Mac is OFFLINE. Long tasks will be queued for when it connects.',
      }
    }

    case 'delegate_to_mac': {
      try {
        const result = await delegateToMac(userId, {
          type: (input.task_type as string) || 'shell',
          description: input.description as string,
          payload: (input.payload as Record<string, unknown>) || {},
        })
        return {
          content: result.mac_online
            ? `Task queued (ID: ${result.taskId}). Mac is online — execution will start shortly.`
            : `Task queued (ID: ${result.taskId}). Mac is offline — will execute when it connects.`,
        }
      } catch (err) {
        return { content: `Failed to delegate: ${err instanceof Error ? err.message : 'Unknown error'}`, error: true }
      }
    }

    default:
      return { content: `Unknown tool: ${name}`, error: true }
  }
}

// Tool definitions for Claude API
export const KIRA_TOOLS = [
  {
    name: 'web_search',
    description: 'Search the internet for current information. Use this when the user asks about news, weather, prices, current events, or anything that requires up-to-date information.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'The search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_url_content',
    description: 'Fetch and read the content of a specific URL/webpage. Use when the user shares a link or you need to read a specific page.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'The URL to fetch' },
      },
      required: ['url'],
    },
  },
  {
    name: 'execute_code',
    description: 'Execute Python or JavaScript code in a secure sandbox. Use for calculations, data processing, generating outputs, or when the user asks you to run code.',
    input_schema: {
      type: 'object' as const,
      properties: {
        code: { type: 'string', description: 'The code to execute' },
        language: { type: 'string', enum: ['python', 'javascript'], description: 'Programming language (default: python)' },
      },
      required: ['code'],
    },
  },
  {
    name: 'query_knowledge',
    description: 'Search through your memories and past conversations with the user. Use when you need to recall something specific the user told you before, or find context from previous interactions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'What to search for in memories and past conversations' },
      },
      required: ['query'],
    },
  },
  {
    name: 'check_mac_status',
    description: 'Check if the user\'s Mac computer is online and available for running long tasks (scraping, heavy processing, local model inference).',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'delegate_to_mac',
    description: 'Send a long-running task to the user\'s Mac for execution. Use for tasks that take more than a few minutes: web scraping, large file processing, running local models, shell scripts, etc. The task will be queued if the Mac is offline.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_type: { type: 'string', enum: ['shell', 'scrape', 'code_exec', 'jarvis_agent'], description: 'Type of task' },
        description: { type: 'string', description: 'Human-readable description of what needs to be done' },
        payload: {
          type: 'object',
          description: 'Task-specific data (e.g., command for shell, urls for scrape, code for code_exec)',
        },
      },
      required: ['task_type', 'description'],
    },
  },
] as const
