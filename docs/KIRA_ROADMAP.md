# KIRA - Roadmap Tecnico

## Fase 1: KIRA Observa (COMPLETADA)
**Status:** Done
**Periodo:** Feb-Mar 2026

### Entregables completados
- [x] Tasks: CRUD + Eisenhower + Kanban + Timer Pomodoro
- [x] Meetings: CRUD + creacion AI + Google Calendar sync
- [x] Habitos: tracking diario + rachas + adherencia
- [x] Analytics: tiempo por categoria/proyecto, heatmap, metricas
- [x] Resumenes AI: diario/semanal/mensual con Claude
- [x] Transcripciones: campo en meetings para pegar transcripcion
- [x] Auth: Supabase Auth con Google OAuth
- [x] Mobile-first: optimizado para iPhone 15 Pro Max
- [x] Deploy: Vercel + dominio

---

## Fase 2: KIRA Entiende
**Status:** Next up
**Estimacion:** 2-4 semanas de desarrollo

### 2.1 Chat Conversacional con KIRA
**Prioridad:** ALTA
**Complejidad:** Media

El usuario puede hablar con KIRA en lenguaje natural. KIRA responde con contexto real de sus datos.

**Implementacion:**
- Tabla `conversations` con mensajes (role, content, timestamp)
- Endpoint `/api/ai/chat` que:
  1. Recibe mensaje del usuario
  2. Carga contexto: tareas activas, meetings de hoy, habitos, ultimas sesiones
  3. Construye system prompt con personalidad + contexto
  4. Llama a Claude con historial de conversacion
  5. Guarda respuesta en DB
- UI: panel de chat lateral o pagina dedicada `/kira`
- Streaming de respuestas (Claude streaming API)

**Ejemplo de interaccion:**
```
Usuario: "Como voy hoy?"
KIRA: "Llevas 2h 15min de trabajo operativo en 3 sesiones. Completaste 2 tasks
(ambas Q2). Tienes 1 meeting a las 16:00 con Pedro — sin briefing preparado.
Los habitos de manana los cumpliste, el de lectura no. Recomendacion: bloquea
45min de Deep Work antes del meeting."
```

**Archivos a crear/modificar:**
- `supabase/migrations/xxx_conversations.sql`
- `src/types/conversation.ts`
- `src/app/api/ai/chat/route.ts`
- `src/components/chat/ChatPanel.tsx`
- `src/lib/hooks/useChat.ts`
- `src/stores/chatStore.ts`

---

### 2.2 System Prompt con Personalidad
**Prioridad:** ALTA (va junto con 2.1)
**Complejidad:** Baja

Definir el system prompt que le da a KIRA su personalidad, tono y comportamiento.

**Implementacion:**
- Archivo `src/lib/ai/kira-system-prompt.ts` con el prompt base
- El prompt se construye dinamicamente:
  ```
  PROMPT FINAL = Personalidad base
               + Perfil del usuario (de DB)
               + Contexto temporal (datos de hoy/semana)
               + Instrucciones especificas del endpoint
  ```
- Configurable desde Settings (el usuario puede ajustar tono, idioma, nivel de detalle)

---

### 2.3 Knowledge Base (RAG)
**Prioridad:** ALTA
**Complejidad:** Alta

Permite inyectar conocimiento externo: transcripciones de Elena, libros, frameworks, SOPs.

**Implementacion:**
1. **Ingesta:**
   - UI para subir texto/PDFs/transcripciones
   - Chunking: dividir texto en fragments de ~500 tokens
   - Embedding: cada chunk → vector (via OpenAI `text-embedding-3-small` o Voyage)
   - Storage: pgvector extension en Supabase

2. **Retrieval:**
   - Cuando KIRA necesita responder, embedea la pregunta del usuario
   - Similarity search contra pgvector (top 5-10 chunks)
   - Chunks relevantes se inyectan en el prompt de Claude

3. **Schema:**
   ```sql
   CREATE TABLE knowledge_documents (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES profiles(id),
     title TEXT NOT NULL,
     source TEXT,              -- 'transcript', 'book', 'sop', 'notes'
     original_text TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE TABLE knowledge_chunks (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     document_id UUID REFERENCES knowledge_documents(id),
     user_id UUID REFERENCES profiles(id),
     content TEXT NOT NULL,
     embedding VECTOR(1536),   -- dimension depends on model
     chunk_index INT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

4. **UI:**
   - Seccion en Settings o pagina `/management/knowledge`
   - Upload de archivos + textarea para pegar texto
   - Lista de documentos indexados con status
   - Busqueda semantica para testear

**Coste estimado:**
- pgvector: incluido en Supabase Pro
- Embeddings API: ~$0.02 por libro completo
- Practicamente gratis

---

### 2.4 Perfil de Usuario Inteligente
**Prioridad:** MEDIA
**Complejidad:** Media

KIRA construye automaticamente un perfil del usuario basado en datos acumulados.

**Implementacion:**
- Tabla `user_profile_ai` con campos generados:
  - `work_patterns`: JSON con horas pico, dias fuertes, duracion media de sesion
  - `priorities`: que tipo de tasks completa mas, que posterga
  - `communication_style`: extraido de transcripciones
  - `strengths` / `improvement_areas`: inferido de metricas
- Cron job semanal (o trigger) que recalcula el perfil
- Este perfil se inyecta en el system prompt de KIRA

---

## Fase 3: KIRA Actua
**Status:** Planificado
**Estimacion:** 4-8 semanas de desarrollo
**Dependencias:** Fase 2 completada

### 3.1 Notificaciones Push
**Prioridad:** ALTA
**Complejidad:** Media

**Implementacion:**
- Service Worker para Web Push API
- Servicio: OneSignal (free tier) o web-push nativo
- Triggers:
  - Meeting en 15min → briefing preparado
  - Resumen diario a hora configurable
  - Alerta si no hay actividad en X horas
  - Habito pendiente antes de fin del dia
- Configurable desde Settings (que notificaciones, a que hora, frecuencia)

### 3.2 Agentes / MCPs
**Prioridad:** ALTA
**Complejidad:** Alta

KIRA puede ejecutar acciones en el mundo real via agentes.

**Agentes prioritarios:**
1. **Calendar Agent:** crear/modificar/cancelar eventos
2. **Web Search Agent:** buscar informacion y resumirla
3. **Meeting Prep Agent:** generar briefings automaticos
4. **Report Agent:** generar informes periodicos
5. **WhatsApp Agent:** enviar mensajes preparados (via API de WhatsApp Business)

**Arquitectura:**
```
Usuario pide accion via Chat
       ↓
KIRA interpreta intent
       ↓
Selecciona agente apropiado
       ↓
Agente ejecuta (con confirmacion del usuario)
       ↓
Resultado se loguea y se reporta
```

**Implementacion tecnica:**
- Claude Tool Use (function calling) para routing de agentes
- Cada agente = un tool definido con schema
- Confirmacion obligatoria antes de acciones externas (safeguard)
- Tabla `agent_executions` para logging

### 3.3 Briefings Automaticos de Meetings
**Prioridad:** MEDIA
**Complejidad:** Media

Antes de cada meeting, KIRA prepara un briefing:
- Quien es el participante (datos de CRM/historial)
- Ultimo contacto y de que se hablo
- Objetivos del meeting
- Puntos abiertos de meetings anteriores
- Contexto relevante del knowledge base

Se guarda en `meetings.pre_notes` automaticamente.

---

## Fase 4: KIRA Anticipa
**Status:** Futuro
**Estimacion:** Ongoing
**Dependencias:** Fase 3 + suficientes datos acumulados (3-6 meses de uso)

### 4.1 Pattern Detection
- Analisis semanal de patrones de productividad
- Deteccion de burnout signals (menos actividad, mas cancelaciones)
- Identificacion de tareas que siempre se postergan (friction analysis)
- Correlacion habitos ↔ productividad

### 4.2 Proactive Suggestions
- KIRA sugiere sin que le preguntes
- Implementacion: cron job diario que analiza datos y genera sugerencias
- Las sugerencias aparecen en Consola Central como cards accionables

### 4.3 Auto-scheduling
- KIRA propone bloques de tiempo basados en carga y patrones
- Integracion con Google Calendar para bloquear automaticamente
- Respeta preferencias del usuario (no programar antes de X hora, etc.)

---

## Prioridades Inmediatas (Proximas 2 semanas)

| # | Feature | Impacto | Esfuerzo | Prioridad |
|---|---------|---------|----------|-----------|
| 1 | Chat conversacional con KIRA | Muy alto | Medio | P0 |
| 2 | System prompt con personalidad | Alto | Bajo | P0 |
| 3 | Knowledge Base (RAG) basico | Muy alto | Alto | P1 |
| 4 | Notificaciones push | Alto | Medio | P1 |
| 5 | Perfil de usuario AI | Medio | Medio | P2 |
| 6 | Meeting Prep Agent | Alto | Medio | P2 |

---

## Requisitos de Infraestructura por Fase

| Fase | Supabase | API Costs | Servicios Extra |
|------|----------|-----------|-----------------|
| 1 (actual) | Free/Pro | ~$5-10/mes | Ninguno |
| 2 | Pro ($25/mes) + pgvector | ~$20-40/mes | Embedding API (~$1/mes) |
| 3 | Pro | ~$40-80/mes | OneSignal (free), WhatsApp Business API |
| 4 | Pro | ~$50-100/mes | Cron service (Vercel crons incluidos) |

**Total estimado Fase 2-3:** ~$70-150/mes todo incluido.
No necesitas hardware especial. Todo corre en la nube.

---

## Decision Log

| Fecha | Decision | Razon |
|-------|----------|-------|
| 2026-03-15 | No crear LLM propio | RAG + Claude es mas potente, barato y mantenible |
| 2026-03-15 | pgvector sobre Pinecone | Integrado en Supabase, sin servicio extra |
| 2026-03-15 | Embeddings OpenAI sobre Voyage | Mas estandar, mejor documentacion, coste similar |
| 2026-03-15 | Chat antes que agentes | El chat es el interfaz natural para todo lo demas |
| 2026-03-15 | Web Push sobre app nativa | Menos friccion, funciona en movil sin App Store |
