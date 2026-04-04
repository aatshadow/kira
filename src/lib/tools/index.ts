import { executeWebSearch } from './web-search'
import { executeGetUrlContent } from './url-content'
import { executeCode } from './code-execution'
import { queryKnowledge } from './knowledge'
import { checkMacStatus, delegateToMac } from './mac-bridge'
import { readEmails, sendEmail, getEmailContent } from './gmail'
import { sendWhatsApp, listWhatsAppChats, readWhatsAppMessages, searchWhatsAppContacts, checkWhatsAppStatus } from './whatsapp'
import { searchSubscribers, sendManyChatMessage, checkManyChatStatus, getSubscriberInfo } from './manychat'
import { getLinkedInProfile, createLinkedInPost, sendLinkedInMessage, checkLinkedInStatus } from './linkedin'

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

    // --- Gmail tools ---
    case 'read_emails': {
      const { emails, error } = await readEmails(userId, {
        query: input.query as string | undefined,
        maxResults: (input.max_results as number) || 10,
        unreadOnly: (input.unread_only as boolean) || false,
      })
      if (error) return { content: `Gmail error: ${error}`, error: true }
      if (emails.length === 0) return { content: 'No emails found matching your criteria.' }
      const formatted = emails.map((e, i) => {
        const unreadMark = e.unread ? ' [NEW]' : ''
        return `${i + 1}. **${e.subject}**${unreadMark}\n   From: ${e.from}\n   Date: ${e.date}\n   Preview: ${e.snippet}\n   [msg_id:${e.id}]`
      }).join('\n\n')
      return { content: `${emails.length} email(s) found:\n\n${formatted}` }
    }

    case 'read_email_content': {
      const { content, error } = await getEmailContent(userId, input.message_id as string)
      if (error) return { content: `Error: ${error}`, error: true }
      return { content }
    }

    case 'send_email': {
      const { success, messageId, error } = await sendEmail(userId, {
        to: input.to as string,
        subject: input.subject as string,
        body: input.body as string,
        cc: input.cc as string | undefined,
        bcc: input.bcc as string | undefined,
      })
      if (!success) return { content: `Error sending email: ${error}`, error: true }
      return { content: `Email sent successfully (ID: ${messageId})` }
    }

    // --- WhatsApp tools ---
    case 'whatsapp_send': {
      const { success, error } = await sendWhatsApp(
        input.recipient as string,
        input.message as string
      )
      if (!success) return { content: `WhatsApp error: ${error}`, error: true }
      return { content: `Mensaje de WhatsApp enviado a ${input.recipient}` }
    }

    case 'whatsapp_chats': {
      const { chats, error } = await listWhatsAppChats(
        input.query as string | undefined,
        (input.limit as number) || 15
      )
      if (error) return { content: `WhatsApp error: ${error}`, error: true }
      if (chats.length === 0) return { content: 'No se encontraron chats.' }
      const formatted = chats.map((c, i) => {
        const name = c.name || c.jid
        const last = c.lastMessage ? `\n   Último: ${c.lastMessage.slice(0, 80)}` : ''
        return `${i + 1}. **${name}** [jid:${c.jid}]${last}`
      }).join('\n\n')
      return { content: `${chats.length} chat(s):\n\n${formatted}` }
    }

    case 'whatsapp_messages': {
      const { messages: msgs, error } = await readWhatsAppMessages(
        input.chat_jid as string,
        (input.limit as number) || 20
      )
      if (error) return { content: `WhatsApp error: ${error}`, error: true }
      if (msgs.length === 0) return { content: 'No se encontraron mensajes.' }
      const formatted = msgs.map(m => {
        const sender = m.isFromMe ? 'Tú' : (m.sender || 'Contacto')
        return `[${m.timestamp}] **${sender}**: ${m.content}`
      }).join('\n')
      return { content: formatted }
    }

    case 'whatsapp_search_contacts': {
      const { contacts, error } = await searchWhatsAppContacts(input.query as string)
      if (error) return { content: `WhatsApp error: ${error}`, error: true }
      if (contacts.length === 0) return { content: 'No se encontraron contactos.' }
      const formatted = contacts.map((c, i) =>
        `${i + 1}. **${c.name || 'Sin nombre'}** [jid:${c.jid}]`
      ).join('\n')
      return { content: `${contacts.length} contacto(s):\n\n${formatted}` }
    }

    case 'whatsapp_status': {
      const { online } = await checkWhatsAppStatus()
      return {
        content: online
          ? 'WhatsApp bridge está ONLINE y funcionando.'
          : 'WhatsApp bridge está OFFLINE. El bridge necesita estar corriendo en localhost:8080.',
      }
    }

    // --- ManyChat (Instagram/Facebook) tools ---
    case 'manychat_search': {
      const { subscribers, error } = await searchSubscribers(input.name as string)
      if (error) return { content: `ManyChat error: ${error}`, error: true }
      if (subscribers.length === 0) return { content: 'No se encontraron suscriptores.' }
      const formatted = subscribers.map((s, i) =>
        `${i + 1}. **${s.first_name} ${s.last_name}** (ID: ${s.id})${s.last_interaction ? ` — Última interacción: ${s.last_interaction}` : ''}`
      ).join('\n')
      return { content: `${subscribers.length} suscriptor(es):\n\n${formatted}` }
    }

    case 'manychat_send': {
      const { success, error } = await sendManyChatMessage(
        input.subscriber_id as string,
        input.message as string
      )
      if (!success) return { content: `ManyChat error: ${error}`, error: true }
      return { content: `Mensaje enviado via ManyChat al suscriptor ${input.subscriber_id}` }
    }

    case 'manychat_subscriber_info': {
      const { subscriber, error } = await getSubscriberInfo(input.subscriber_id as string)
      if (error) return { content: `ManyChat error: ${error}`, error: true }
      if (!subscriber) return { content: 'Suscriptor no encontrado.' }
      return {
        content: `**${subscriber.first_name} ${subscriber.last_name}**\nID: ${subscriber.id}\nÚltima interacción: ${subscriber.last_interaction || 'N/A'}\nSuscrito: ${subscriber.subscribed || 'N/A'}`,
      }
    }

    case 'manychat_status': {
      const { connected, pageName, error } = await checkManyChatStatus()
      if (!connected) return { content: `ManyChat no conectado: ${error}`, error: true }
      return { content: `ManyChat CONECTADO${pageName ? ` — Página: ${pageName}` : ''}` }
    }

    // --- LinkedIn tools ---
    case 'linkedin_profile': {
      const { profile, error } = await getLinkedInProfile()
      if (error) return { content: `LinkedIn error: ${error}`, error: true }
      if (!profile) return { content: 'No se pudo obtener perfil.' }
      return { content: `**${profile.firstName} ${profile.lastName}**\nID: ${profile.id}` }
    }

    case 'linkedin_post': {
      const { success, postId, error } = await createLinkedInPost(input.text as string)
      if (!success) return { content: `LinkedIn error: ${error}`, error: true }
      return { content: `Post publicado en LinkedIn (ID: ${postId})` }
    }

    case 'linkedin_message': {
      const { success, error } = await sendLinkedInMessage(
        input.recipient_urn as string,
        input.message as string
      )
      if (!success) return { content: `LinkedIn error: ${error}`, error: true }
      return { content: `Mensaje enviado via LinkedIn` }
    }

    case 'linkedin_status': {
      const { connected, name, error } = await checkLinkedInStatus()
      if (!connected) return { content: `LinkedIn no conectado: ${error}`, error: true }
      return { content: `LinkedIn CONECTADO — Perfil: ${name}` }
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
  // --- Gmail tools ---
  {
    name: 'read_emails',
    description: 'Read the user\'s recent emails from Gmail. Use when they ask about their emails, inbox, or want to check for specific messages. You can filter by search query (e.g., "from:john", "subject:invoice", "is:unread").',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Gmail search query (optional). Examples: "from:john@example.com", "subject:factura", "is:unread", "after:2026/04/01"' },
        max_results: { type: 'number', description: 'Maximum number of emails to return (default: 10, max: 20)' },
        unread_only: { type: 'boolean', description: 'Only show unread emails (default: false)' },
      },
      required: [],
    },
  },
  {
    name: 'read_email_content',
    description: 'Read the full content/body of a specific email by its message ID. Use after read_emails to get the complete text of an email the user wants to read.',
    input_schema: {
      type: 'object' as const,
      properties: {
        message_id: { type: 'string', description: 'The Gmail message ID (from read_emails results)' },
      },
      required: ['message_id'],
    },
  },
  {
    name: 'send_email',
    description: 'Send an email from the user\'s Gmail account. Use when the user asks you to send, reply, or compose an email. Always confirm with the user before sending.',
    input_schema: {
      type: 'object' as const,
      properties: {
        to: { type: 'string', description: 'Recipient email address(es), comma-separated' },
        subject: { type: 'string', description: 'Email subject line' },
        body: { type: 'string', description: 'Email body (HTML supported)' },
        cc: { type: 'string', description: 'CC recipients, comma-separated (optional)' },
        bcc: { type: 'string', description: 'BCC recipients, comma-separated (optional)' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  // --- WhatsApp tools ---
  {
    name: 'whatsapp_send',
    description: 'Send a WhatsApp message to a contact. Use when the user asks you to send a WhatsApp message. You can use a phone number (with country code, e.g., "34612345678") or a JID. ALWAYS confirm with the user before sending.',
    input_schema: {
      type: 'object' as const,
      properties: {
        recipient: { type: 'string', description: 'Phone number with country code (e.g., "34612345678") or WhatsApp JID' },
        message: { type: 'string', description: 'The message text to send' },
      },
      required: ['recipient', 'message'],
    },
  },
  {
    name: 'whatsapp_chats',
    description: 'List the user\'s recent WhatsApp chats. Use when they ask about their WhatsApp conversations, recent messages, or want to find a specific chat.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search term to filter chats by name (optional)' },
        limit: { type: 'number', description: 'Maximum number of chats to return (default: 15)' },
      },
      required: [],
    },
  },
  {
    name: 'whatsapp_messages',
    description: 'Read messages from a specific WhatsApp chat. Use after whatsapp_chats to read the conversation history with a contact or group.',
    input_schema: {
      type: 'object' as const,
      properties: {
        chat_jid: { type: 'string', description: 'The WhatsApp chat JID (from whatsapp_chats results)' },
        limit: { type: 'number', description: 'Number of messages to retrieve (default: 20)' },
      },
      required: ['chat_jid'],
    },
  },
  {
    name: 'whatsapp_search_contacts',
    description: 'Search WhatsApp contacts by name or phone number. Use to find a contact\'s JID before sending a message.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Name or phone number to search for' },
      },
      required: ['query'],
    },
  },
  {
    name: 'whatsapp_status',
    description: 'Check if the WhatsApp bridge is online and connected. Use to verify WhatsApp integration is working.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  // --- ManyChat (Instagram/Facebook) tools ---
  {
    name: 'manychat_search',
    description: 'Search ManyChat subscribers (Instagram/Facebook contacts) by name. Use when the user wants to find or message someone on Instagram.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Name to search for' },
      },
      required: ['name'],
    },
  },
  {
    name: 'manychat_send',
    description: 'Send a message to a ManyChat subscriber (Instagram/Facebook DM). ALWAYS confirm with the user before sending.',
    input_schema: {
      type: 'object' as const,
      properties: {
        subscriber_id: { type: 'string', description: 'ManyChat subscriber ID (from manychat_search results)' },
        message: { type: 'string', description: 'Message text to send' },
      },
      required: ['subscriber_id', 'message'],
    },
  },
  {
    name: 'manychat_subscriber_info',
    description: 'Get detailed info about a ManyChat subscriber.',
    input_schema: {
      type: 'object' as const,
      properties: {
        subscriber_id: { type: 'string', description: 'ManyChat subscriber ID' },
      },
      required: ['subscriber_id'],
    },
  },
  {
    name: 'manychat_status',
    description: 'Check if ManyChat is connected. Verifies the API key and returns the connected page name.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  // --- LinkedIn tools ---
  {
    name: 'linkedin_profile',
    description: 'Get the user\'s LinkedIn profile information.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'linkedin_post',
    description: 'Publish a post on the user\'s LinkedIn profile. ALWAYS confirm the text with the user before posting.',
    input_schema: {
      type: 'object' as const,
      properties: {
        text: { type: 'string', description: 'The post text content' },
      },
      required: ['text'],
    },
  },
  {
    name: 'linkedin_message',
    description: 'Send a LinkedIn message to a connection. Note: LinkedIn messaging API has restricted access.',
    input_schema: {
      type: 'object' as const,
      properties: {
        recipient_urn: { type: 'string', description: 'LinkedIn URN of the recipient (urn:li:person:xxx)' },
        message: { type: 'string', description: 'Message text' },
      },
      required: ['recipient_urn', 'message'],
    },
  },
  {
    name: 'linkedin_status',
    description: 'Check if LinkedIn is connected and get profile info.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
] as const
