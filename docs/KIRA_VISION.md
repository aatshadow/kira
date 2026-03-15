# KIRA - Vision

## La Vision: De Dashboard a Inteligencia Operativa Autonoma

KIRA no es una app. Es un sistema de inteligencia que crece con su usuario.

La analogia mas cercana es Jarvis — pero realista y construido sobre tecnologia que existe hoy. No es ciencia ficcion. Es ingenieria aplicada sobre LLMs, RAG, agentes y automatizacion.

---

## El Problema que KIRA Resuelve

Un founder/emprendedor gestiona:
- 20-50 tareas activas
- 5-15 meetings por semana
- Multiples canales de comunicacion (WhatsApp, email, Slack)
- Habitos y rutinas de alto rendimiento
- Decisiones estrategicas con informacion fragmentada
- Relaciones con equipo, clientes, socios

Hoy, toda esta gestion es manual. El founder es su propio COO, assistant, project manager y analista. KIRA absorbe esa carga progresivamente.

---

## Las 4 Fases de Evolucion de KIRA

### Fase 1: KIRA Observa (ACTUAL - v1.0)
KIRA recoge datos. Tasks, meetings, habitos, tiempo, transcripciones.
El usuario introduce todo manualmente. KIRA organiza y resume.

**Valor:** Visibilidad total de la operativa personal.

### Fase 2: KIRA Entiende (PROXIMA - v2.0)
KIRA tiene memoria persistente. Sabe quien eres, como trabajas, que priorizas.
Chat conversacional donde KIRA responde con contexto real de tus datos.
Knowledge base con RAG: le inyectas transcripciones, libros, frameworks.
System prompt con personalidad definida.

**Valor:** Un asistente que te conoce. No empiezas de cero cada vez.

### Fase 3: KIRA Actua (v3.0)
KIRA ejecuta acciones via agentes/MCPs:
- Envia mensajes preparados por WhatsApp/email
- Crea eventos en calendario
- Busca informacion en internet
- Prepara briefings antes de meetings
- Genera reportes automaticos
- Notificaciones push inteligentes

**Valor:** Reduccion real de tiempo operativo. KIRA hace, no solo dice.

### Fase 4: KIRA Anticipa (v4.0)
KIRA detecta patrones y actua antes de que le pidas:
- "Llevas 3 dias sin hacer Deep Work. Bloqueo 2h manana?"
- "Tu meeting con X es en 1h. Aqui tienes el briefing basado en vuestro ultimo call."
- "Elena cerro 3 deals esta semana con este patron. Quieres que lo documente?"
- "Tu adherencia a habitos bajo un 20% esta semana. Esto es lo que cambio."

**Valor:** Inteligencia proactiva. KIRA es tu segundo cerebro operativo.

---

## Que NO es KIRA

- No es un reemplazo de herramientas especializadas (no reemplaza Figma, ni un CRM enterprise)
- No es un chatbot generico (tiene contexto especifico de TU vida operativa)
- No es un LLM propio (usa Claude como motor, la inteligencia esta en los datos y el sistema)
- No necesita hardware especial (corre en la nube, accesible desde cualquier dispositivo)

---

## Arquitectura Tecnica de la Vision

### Capa de Datos (Supabase)
```
Datos Estructurados (Postgres)
├── tasks, meetings, habits, sessions, summaries
├── user_profile (preferencias, estilo, contexto)
├── knowledge_entries (transcripciones, notas, frameworks)
├── agent_logs (historial de acciones de agentes)
└── conversations (historial de chat con KIRA)

Datos Vectoriales (pgvector extension)
├── embeddings de transcripciones
├── embeddings de knowledge base
├── embeddings de conversaciones
└── embeddings de notas/contexto
```

### Capa de Inteligencia
```
System Prompt Dinamico
├── Personalidad base de KIRA
├── Perfil del usuario (generado de datos)
├── Contexto temporal (que paso hoy/esta semana)
└── Knowledge relevante (RAG query)

RAG Pipeline
├── Ingesta: texto → chunks → embeddings (via API de OpenAI o Voyage)
├── Almacenamiento: pgvector en Supabase
├── Retrieval: similarity search sobre query del usuario
└── Augmentation: contexto inyectado en el prompt de Claude
```

### Capa de Accion (Agentes/MCPs)
```
KIRA Agent Orchestrator
├── WhatsApp Agent (enviar/recibir mensajes)
├── Calendar Agent (crear/modificar eventos)
├── Email Agent (drafts, envios programados)
├── Web Agent (busquedas, scraping)
├── Notification Agent (push al movil)
└── Custom Agents (CRM, Notion, Slack...)
```

---

## Limites Tecnicos y Realidades

### Almacenamiento (Supabase Pro - $25/mes)
- 8GB base de datos → suficiente para 5-10 anos de datos personales
- 100GB file storage → transcripciones, documentos, audios
- No te vas a quedar sin espacio. El limite no es storage.

### Contexto de LLM
- Claude tiene ventana de 200K tokens (~150K palabras)
- Con RAG, solo inyectas lo relevante (top 5-10 chunks por query)
- Nunca necesitas enviar "todo" — solo lo que importa para esa pregunta

### Costes de API
- Claude API: ~$3-15/1M tokens de input, $15-75/1M de output
- Uso personal intensivo: $20-50/mes en API calls
- Embeddings (para RAG): ~$0.10/1M tokens — practicamente gratis

### Latencia
- Respuestas de Claude: 1-5 segundos
- RAG search + response: 2-7 segundos
- Acciones de agentes: depende del servicio (WhatsApp ~1s, email ~2s)

### Que SI puedes hacer ahora con la tecnologia actual
- Chat con memoria persistente y personalidad
- RAG sobre transcripciones y libros
- Agentes que ejecutan acciones (MCPs de Claude)
- Notificaciones push (via web push o servicio como OneSignal)
- Analisis de patrones sobre datos historicos
- Resumenes automaticos sin intervencion

### Que todavia NO es viable (o no merece la pena)
- LLM propio entrenado: requiere millones en compute, no aporta valor sobre RAG
- Voz en tiempo real bidireccional: posible pero costoso y con latencia
- Autonomia total sin supervision: los LLMs alucinan, necesitan guardrails

---

## El Moat (Ventaja Competitiva)

La ventaja de KIRA no es la tecnologia — es los datos.

Cuanto mas tiempo uses KIRA, mas te conoce. Ese conocimiento acumulado es irreplicable. Ningun competidor puede ofrecer "tu KIRA" porque no tiene tus datos, tus patrones, tu contexto.

Esto es lo mismo que hace que Spotify sea mejor con el tiempo, o que el algoritmo de TikTok sea adictivo. Pero aplicado a productividad y toma de decisiones.

---

## Norte Estrella

> KIRA es la unica herramienta que necesitas abrir cada manana.
> Te dice que hacer, te prepara para hacerlo, y ejecuta lo que puede por ti.
> Cuanto mas la usas, mejor te conoce. Cuanto mejor te conoce, mas tiempo te ahorra.
