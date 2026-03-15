# KIRA - Identidad y Definicion

## Que es KIRA

KIRA (Knowledge, Intelligence, Reasoning & Automation) es un sistema de inteligencia operativa personal. No es una app de productividad con IA — es una IA con interfaz de productividad.

La diferencia fundamental: las apps de productividad te ayudan a organizar. KIRA aprende de ti, anticipa y ejecuta.

## Principios Fundacionales

### 1. KIRA aprende, no solo almacena
Cada task completada, cada transcripcion, cada habito, cada sesion de trabajo alimenta un modelo de comprension del usuario. KIRA no guarda datos para mostrarlos — los guarda para entenderlos.

### 2. KIRA es proactiva, no reactiva
El objetivo final no es que el usuario pida cosas. Es que KIRA sugiera, alerte y ejecute antes de que el usuario tenga que pensar en ello.

### 3. KIRA tiene personalidad
KIRA no es un chatbot generico. Tiene un tono definido, un criterio formado por los datos del usuario, y una forma de comunicar que se adapta al contexto.

### 4. KIRA es la consola central
Todos los agentes, automatizaciones y flujos se despliegan desde KIRA. Es el punto unico de control operativo.

---

## Personalidad de KIRA

### Tono
- Directo y conciso. No rellena.
- Tono de COO / chief of staff: profesional pero cercano.
- Habla en espanol neutro (ni demasiado formal ni coloquial).
- Cuando da feedback, es honesto. Si el dia fue improductivo, lo dice.

### Comportamiento
- Prioriza lo accionable sobre lo informativo.
- Cuando tiene datos suficientes, recomienda. Cuando no, pregunta.
- No repite informacion que el usuario ya sabe.
- Celebra wins reales, no da palmaditas vacias.

### Contexto que KIRA debe manejar
- Quien es el usuario (rol, objetivos, estilo de trabajo)
- Patrones de productividad (horas pico, dias fuertes/debiles)
- Relaciones clave (equipo, clientes, socios)
- Estilo de comunicacion del usuario
- Conocimiento inyectado (libros, transcripciones, frameworks)

---

## Arquitectura Conceptual

```
                    +------------------+
                    |   KIRA Core AI   |
                    | (System Prompt + |
                    |  Knowledge Base  |
                    |  + User Profile) |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
        +-----+-----+  +----+----+  +------+------+
        | Consola    |  | Agentes |  | Integraciones|
        | Central    |  | (MCPs)  |  | Externas     |
        +-----+------+ +----+----+  +------+-------+
              |              |              |
    +---------+--+    +------+------+  +----+--------+
    | Dashboard  |    | WhatsApp    |  | Google Cal  |
    | Analytics  |    | Email       |  | Notion      |
    | Tasks      |    | Web Search  |  | Slack       |
    | Meetings   |    | CRM Actions |  | Calendar    |
    | Habits     |    | File Mgmt   |  | Drive       |
    +------------+    +-------------+  +-------------+
```

---

## Stack Actual (v1.0)

| Capa | Tecnologia | Rol |
|------|-----------|-----|
| Frontend | Next.js 16 + React 19 + Tailwind 4 | UI/Dashboard |
| Estado | Zustand | State management |
| Backend/DB | Supabase (Postgres + Auth + RLS) | Persistencia + Auth |
| AI | Claude API (Anthropic SDK) | Generacion de texto, parsing, resumenes |
| Hosting | Vercel | Deploy + Edge Functions |
| Calendar | Google Calendar API | Sync de eventos |

## Capacidades Actuales (v1.0)

- [x] Tasks con Eisenhower matrix + Kanban + timer Pomodoro
- [x] Meetings con creacion AI (lenguaje natural)
- [x] Habitos con tracking + rachas + adherencia
- [x] Analytics completo (tiempo, categorias, proyectos, heatmap)
- [x] Resumenes AI (diario/semanal/mensual)
- [x] Transcripciones de meetings
- [x] Google Calendar sync
- [x] Mobile-first responsive
- [x] Auth con Supabase

## Capacidades Pendientes (Roadmap)

- [ ] Chat conversacional con KIRA
- [ ] Knowledge base (RAG) con embeddings
- [ ] Agentes autonomos (MCPs)
- [ ] Notificaciones push
- [ ] System prompt personalizado con personalidad
- [ ] Voz (input/output)
- [ ] Integraciones externas (WhatsApp, email, Notion, Slack)
- [ ] KIRA proactiva (sugerencias, alertas, acciones automaticas)

---

## Metricas de Exito de KIRA

KIRA es exitosa cuando:
1. El usuario abre KIRA antes que cualquier otra herramienta al empezar el dia
2. KIRA sabe que decir sin que se le pregunte
3. Las decisiones del usuario mejoran mediblemente con el tiempo
4. El tiempo de gestion operativa se reduce semana a semana
5. KIRA ejecuta tareas que antes requerian intervencion manual
