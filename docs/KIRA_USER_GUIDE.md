# KIRA - Guia de Usuario Completa

> KIRA (Knowledge, Intelligence, Reasoning & Automation) es tu sistema de inteligencia operativa personal. Esta guia te ensena a usar cada funcion para sacar el maximo rendimiento de tu dia.

---

## Indice

1. [Primeros pasos](#1-primeros-pasos)
2. [Consola Central — Tu centro de operaciones](#2-consola-central)
3. [Tasks — Gestion inteligente de tareas](#3-tasks)
4. [Meetings — Tus reuniones bajo control](#4-meetings)
5. [Habitos — Construye consistencia](#5-habitos)
6. [Analytics — Tu inteligencia operativa](#6-analytics)
7. [Resumenes AI — Tu analista personal](#7-resumenes-ai)
8. [Google Calendar — Sincronizacion](#8-google-calendar)
9. [Flujo de trabajo recomendado](#9-flujo-de-trabajo-recomendado)
10. [Tips avanzados para power users](#10-tips-avanzados)
11. [FAQ y solucion de problemas](#11-faq)

---

## 1. Primeros Pasos

### Acceso
KIRA se accede desde el navegador en tu URL de Vercel. Funciona en desktop y movil (optimizado para iPhone 15 Pro Max).

### Login
KIRA usa autenticacion con Google via Supabase. Haz click en "Iniciar sesion con Google" y listo. Tu cuenta se crea automaticamente la primera vez.

### Navegacion principal
La barra superior te da acceso a las 5 secciones principales:

| Seccion | Que encontraras |
|---------|----------------|
| **Consola Central** | Vista general del dia: tareas, meetings, habitos, resumen |
| **Management** | Gestion detallada de tasks, meetings y habitos |
| **KIRA** | Chat con KIRA (proximamente) |
| **Analytics** | Metricas, graficas y resumenes AI |
| **Settings** | Configuracion de cuenta e integraciones |

> `[SCREENSHOT: Barra de navegacion superior con las 5 secciones]`

---

## 2. Consola Central

La Consola Central es lo primero que ves al abrir KIRA. Es tu briefing diario.

### Que muestra

**Seccion superior — Resumen del dia:**
- Tareas de hoy (pendientes y completadas)
- Estado general del dia de un vistazo

**Proximos meetings:**
- Los 3 meetings mas cercanos (combina KIRA + Google Calendar)
- Cada meeting muestra: titulo, fecha/hora, duracion, participantes
- Indicador de origen: punto morado = KIRA, punto azul = Google Calendar

**Resumen diario AI:**
- Si hay datos suficientes, KIRA genera automaticamente un resumen de tu dia
- Puedes regenerarlo manualmente

> `[SCREENSHOT: Consola Central completa mostrando tareas del dia, meetings proximos y resumen]`

### Como usarla

La Consola Central es tu **primera parada cada manana**. Abrela, mira que tienes hoy, y decide tus prioridades. No necesitas navegar a ninguna otra seccion para tener el contexto del dia.

---

## 3. Tasks

El sistema de tasks de KIRA combina tres metodologias: Eisenhower Matrix, Kanban y Pomodoro Timer.

### 3.1 Crear una tarea

1. Ve a **Management > Tasks**
2. Click en **"+ Nueva task"**
3. Rellena los campos:

| Campo | Descripcion | Ejemplo |
|-------|------------|---------|
| **Titulo** | Nombre corto y claro de la tarea | "Preparar propuesta cliente X" |
| **Descripcion** | Detalle opcional | "Incluir pricing y timeline" |
| **Prioridad** | Basada en Eisenhower Matrix (ver abajo) | Q2 - Importante |
| **Estado** | Donde esta la tarea ahora | To Do |
| **Categoria** | Tipo de trabajo | Operativa, Ventas, Personal... |
| **Proyecto** | A que proyecto pertenece | "Black Wolf", "KIRA"... |
| **Fecha limite** | Cuando debe estar hecha | 2026-03-20 |
| **Tiempo estimado** | Cuanto crees que tardara (minutos) | 90 |

> `[SCREENSHOT: Modal de creacion de task con todos los campos]`

### 3.2 Eisenhower Matrix (Prioridades)

KIRA usa la matriz de Eisenhower para priorizar. Cada tarea se clasifica en un cuadrante:

```
                    URGENTE              NO URGENTE
                 ┌──────────────────┬──────────────────┐
   IMPORTANTE    │  Q1 - HACER YA   │  Q2 - PLANIFICAR │
                 │  (rojo)           │  (amarillo)       │
                 │  Crisis, deadline │  Deep work,       │
                 │  inminente        │  estrategia       │
                 ├──────────────────┼──────────────────┤
   NO IMPORTANTE │  Q3 - DELEGAR     │  Q4 - ELIMINAR   │
                 │  (azul)           │  (gris)           │
                 │  Interrupciones,  │  Distracciones,  │
                 │  emails urgentes  │  tiempo perdido  │
                 └──────────────────┴──────────────────┘
```

**Regla de oro:** La mayoria de tu tiempo deberia estar en Q2. Si vives en Q1, estas apagando fuegos. Si estas en Q3/Q4, no estas avanzando.

**Como usarlo en KIRA:**
- Al crear una task, selecciona Q1-Q4
- En el backlog, las tasks se ordenan por prioridad
- KIRA usa estas prioridades para generar resumenes inteligentes

### 3.3 Kanban Board

Las tasks fluyen por estados:

```
BACKLOG → TO DO → IN PROGRESS → WAITING → DONE
```

| Estado | Cuando usarlo |
|--------|--------------|
| **Backlog** | Ideas, tareas futuras, cosas que no vas a hacer esta semana |
| **To Do** | Comprometido: lo vas a hacer esta semana |
| **In Progress** | Estas trabajando en ello ahora mismo |
| **Waiting** | Depende de alguien mas (esperando respuesta, aprobacion...) |
| **Done** | Completada |

**Tip:** No tengas mas de 3 tasks en "In Progress" al mismo tiempo. Si tienes mas, no estas enfocado.

> `[SCREENSHOT: Vista Kanban mostrando tasks en diferentes columnas]`

### 3.4 Timer Pomodoro

Cada task tiene un timer integrado para trackear tiempo real de trabajo.

**Como usarlo:**

1. Abre una task (click en ella)
2. Click en el boton de **Play** para iniciar el timer
3. Trabaja en la tarea
4. Click en **Pause** si necesitas parar
5. Click en **Stop** cuando termines la sesion

**Lo que se registra:**
- Tiempo bruto (desde play hasta stop)
- Tiempo neto (descontando pausas)
- Todas las sesiones quedan en el historial

**Por que es importante:**
- KIRA usa estos datos para calcular tu productividad real
- Puedes ver cuanto tardas realmente vs. lo que estimaste
- Analytics te muestra donde gastas tu tiempo (por categoria, proyecto)

> `[SCREENSHOT: Task abierta con timer activo mostrando tiempo]`

**Tips para el timer:**
- Usa sesiones de 25-50 minutos (Pomodoro)
- Siempre asigna la task correcta antes de dar play — asi los datos son precisos
- No dejes el timer corriendo si no estas trabajando — contamina las metricas

### 3.5 Categorias y Proyectos

Organiza tus tasks en dos dimensiones:

**Categorias** = Tipo de trabajo:
- Operativa (tareas del dia a dia)
- Ventas (prospecting, calls, proposals)
- Estrategia (planning, vision)
- Personal (habitos, salud, aprendizaje)
- Crea las que necesites

**Proyectos** = A que iniciativa pertenece:
- "Black Wolf"
- "KIRA"
- "Cliente X"
- Crea los que necesites

Esta clasificacion alimenta Analytics: puedes ver exactamente cuanto tiempo dedicas a cada tipo de trabajo y a cada proyecto.

---

## 4. Meetings

### 4.1 Crear un meeting manualmente

1. Ve a **Management > Meetings**
2. Click en **"+ Nuevo meeting"**
3. Rellena: titulo, fecha/hora, duracion, participantes, notas previas

| Campo | Descripcion | Ejemplo |
|-------|------------|---------|
| **Titulo** | Nombre del meeting | "Call con equipo ventas" |
| **Fecha y hora** | Cuando es | 2026-03-17 10:00 |
| **Duracion** | En minutos | 60 |
| **Participantes** | Nombres separados por coma | "Pedro, Maria, Carlos" |
| **Notas previas** | Agenda o puntos a tratar | "Revisar pipeline Q1, asignar cuentas" |

> `[SCREENSHOT: Modal de creacion de meeting en modo manual]`

### 4.2 Crear un meeting con AI

KIRA puede crear meetings desde lenguaje natural:

1. Al crear un meeting, selecciona el modo **"AI"**
2. Escribe en lenguaje natural lo que necesitas
3. KIRA extrae automaticamente: titulo, fecha, duracion, participantes y notas

**Ejemplos que KIRA entiende:**

```
"Reunion con Pedro manana a las 10 para revisar el contrato, una hora"

"Call rapido con Maria el viernes a las 16:30, media hora,
para hablar del presupuesto de Q2"

"Meeting de equipo el lunes a primera hora, 45 minutos,
con Juan, Ana y Carlos. Agenda: OKRs del mes y retrospectiva"
```

KIRA parsea todo esto y rellena los campos automaticamente. Tu solo revisas y confirmas.

> `[SCREENSHOT: Modal de meeting en modo AI con texto natural y preview de datos extraidos]`

**Tip:** Usa Cmd+Enter (Mac) o Ctrl+Enter (Windows) para enviar mas rapido.

### 4.3 Estados de un meeting

| Estado | Significado |
|--------|------------|
| **Programado** | Futuro, pendiente de realizarse |
| **En curso** | Ocurriendo ahora |
| **Completado** | Ya se realizo |
| **Cancelado** | No se realizo |

**Para marcar un meeting como completado:**
- Hover sobre el meeting > click en los 3 puntos (menu) > "Marcar completado"
- Esto lo mueve a la pestana "Completados"

### 4.4 Transcripciones

Esta es una de las funciones mas valiosas de KIRA. Cuando un meeting se completa, puedes guardar la transcripcion.

**Como anadir una transcripcion:**

1. Marca el meeting como **completado**
2. Click en el meeting para editarlo
3. Veras el campo **"Transcripcion"** (solo aparece en meetings completados)
4. Pega la transcripcion completa
5. Click en **"Guardar"**

> `[SCREENSHOT: Modal de edicion de meeting completado mostrando el campo de transcripcion]`

**De donde sacar transcripciones:**
- **Google Meet:** Activa la transcripcion automatica en la reunion. Despues, descargala desde Google Drive.
- **Zoom:** Habilita transcripcion en settings. Despues de la call, descarga el archivo .txt.
- **Otter.ai:** App gratuita que transcribe en tiempo real. Copia el texto y pegalo en KIRA.
- **iOS/Android grabadora:** Graba la llamada, sube el audio a un servicio de transcripcion como Whisper o Otter.
- **Manual:** Si la reunion fue corta, escribe los puntos clave directamente.

**Por que guardar transcripciones:**
- KIRA las usara en el futuro para generar resumenes de meetings
- Alimentan la knowledge base para contexto en conversaciones futuras
- Puedes buscar que se dijo en cualquier meeting pasado
- Son la base para briefings automaticos antes de la siguiente reunion con esa persona

**Indicadores en la lista de meetings:**
- **Verde "Transcripcion"** = tiene transcripcion guardada
- **Ambar "Sin transcripcion"** = completado pero sin transcripcion

> `[SCREENSHOT: Lista de meetings completados mostrando indicadores de transcripcion]`

### 4.5 Pestanas de Meetings

La pagina de meetings tiene 3 pestanas:
- **Proximos:** meetings programados y en curso
- **Completados:** meetings que ya se realizaron
- **Cancelados:** meetings cancelados

**Tip:** Acostumbrate a marcar meetings como completados el mismo dia y pegar la transcripcion antes de que se te olvide. Es lo que mas valor genera a largo plazo.

---

## 5. Habitos

Los habitos son la base del rendimiento sostenible. KIRA te ayuda a trackear y mantener consistencia.

### 5.1 Crear un habito

1. Ve a **Management > Habitos**
2. Click en **"+ Nuevo habito"**
3. Define: nombre, frecuencia, descripcion

**Ejemplos de habitos productivos:**
- Meditacion 10min (diario)
- Lectura 30min (diario)
- Ejercicio (3x semana)
- Revision semanal (semanal)
- Journaling (diario)
- Deep work 2h (diario, dias laborables)

### 5.2 Completar habitos

Cada dia, marca los habitos que completaste. Es simple: click y listo.

> `[SCREENSHOT: Vista de habitos del dia con checkboxes]`

### 5.3 Rachas y adherencia

KIRA trackea automaticamente:

- **Racha actual:** cuantos dias consecutivos has completado el habito
- **Adherencia:** porcentaje de veces completado sobre el total esperado
- **Mapa semanal:** visualizacion de que dias completaste cada habito

**Por que importan las rachas:**
La consistencia es mas importante que la intensidad. Una racha de 30 dias de lectura vale mas que una sesion maraton de 8 horas. KIRA te muestra tus rachas para que NO quieras romperlas.

> `[SCREENSHOT: Seccion de Analytics > Habitos mostrando rachas y adherencia]`

---

## 6. Analytics

Analytics es el cerebro analitico de KIRA. Te muestra exactamente como usas tu tiempo y donde puedes mejorar.

### 6.1 Filtros de tiempo

En la esquina superior derecha puedes filtrar por:
- **Hoy:** solo datos del dia actual
- **Esta semana:** lunes a domingo de la semana actual
- **Este mes:** todo el mes en curso

> `[SCREENSHOT: Selector de rango de fechas en Analytics]`

### 6.2 Pestana Overview

Vista general con las metricas mas importantes:

**Tarjetas superiores:**
- **Tiempo total:** horas de trabajo operativo + meetings
- **Tasks completadas:** cuantas tasks marcaste como done
- **Meetings completados:** cuantos meetings se realizaron
- **Habitos:** porcentaje de adherencia

**Graficas:**
- **Tiempo por categoria:** donut chart — donde gastas tu tiempo (Operativa, Ventas, Estrategia...)
- **Tiempo por proyecto:** barra horizontal — cuanto tiempo dedicas a cada proyecto
- **Mapa de productividad:** heatmap semanal — a que horas y que dias trabajas mas

> `[SCREENSHOT: Analytics Overview completo con las 4 metricas y graficas]`

**Como leer el heatmap:**
- Las celdas mas brillantes (cyan) indican horas con mas actividad
- Busca patrones: si tus mananas son siempre activas y las tardes vacias, programa deep work por la manana
- Si hay dias completamente vacios, preguntate por que

### 6.3 Pestana Tasks

Analisis profundo de tus tareas:

- **Tasa de completado:** % de tasks creadas que terminaste
- **Tiempo promedio por task:** cuanto tardas de media
- **Eficiencia:** tiempo estimado vs. tiempo real (>100% = terminaste antes de lo estimado)
- **Score KIRA:** puntuacion de productividad
- **Creadas vs Completadas:** grafica temporal para ver si acumulas backlog
- **Tiempo por prioridad:** cuanto dedicas a cada cuadrante de Eisenhower
- **Tasks por estado:** distribucion actual de tus tasks
- **Top 5 tasks mas largas:** donde se te fue mas tiempo

> `[SCREENSHOT: Analytics > Tasks mostrando eficiencia y graficas]`

**Metricas clave a vigilar:**
- Si tu **tasa de completado** baja del 60%, estas creando mas de lo que puedes hacer
- Si tu **eficiencia** esta consistentemente bajo 80%, tus estimaciones son optimistas — ajustalas
- Si el **tiempo por prioridad** muestra mas Q3/Q4 que Q2, estas ocupado pero no productivo

### 6.4 Pestana Meetings

Todo sobre tus reuniones:

- **Total meetings:** cuantos en el periodo
- **Tiempo en meetings:** horas acumuladas
- **Duracion promedio:** media en minutos
- **Meetings por estado:** pie chart (completados, programados, cancelados)
- **Participacion:** con participantes vs. solo
- **Proximos meetings:** lista de lo que viene
- **Historial:** meetings completados con duracion

> `[SCREENSHOT: Analytics > Meetings con pie chart y metricas]`

**Metricas clave:**
- Si el **tiempo en meetings** supera el 40% de tu tiempo total, estas en demasiadas reuniones
- Muchos meetings cancelados = problema de planificacion o falta de priorizacion

### 6.5 Pestana Habitos

Analisis de consistencia:

- **Total habitos:** cuantos tienes configurados
- **Completados hoy:** cuantos hiciste hoy
- **Adherencia:** porcentaje general
- **Mejor racha:** tu record de dias consecutivos
- **Tasa de completado por habito:** barra de progreso individual
- **Rachas actuales:** cards con dias consecutivos de cada habito
- **Mapa semanal:** heatmap de que dias completaste cada habito

> `[SCREENSHOT: Analytics > Habitos con rachas y mapa semanal]`

---

## 7. Resumenes AI

KIRA genera resumenes ejecutivos de tu actividad usando inteligencia artificial.

### Como generar un resumen

1. Ve a **Analytics** (pestana Overview)
2. Baja hasta la seccion **"Resumenes AI"**
3. Click en el tipo de resumen:
   - **Resumen diario:** analisis del dia de hoy
   - **Resumen semanal:** analisis de la semana actual
   - **Resumen mensual:** analisis del mes en curso

> `[SCREENSHOT: Seccion Resumenes AI con los 3 botones y un resumen generado]`

### Que incluye un resumen

KIRA analiza automaticamente:
- Horas trabajadas y distribucion
- Tasks creadas, completadas y pendientes
- Meetings realizados y tiempo invertido
- Habitos cumplidos
- Sesiones de trabajo detalladas (por categoria y proyecto)

Con todo esto, genera:
- **Logros clave** del periodo
- **Areas de mejora** detectadas
- **2-3 recomendaciones** concretas y accionables
- **Metricas** resumidas

### Cuando usarlos

| Resumen | Cuando | Para que |
|---------|--------|----------|
| **Diario** | Al final de cada dia | Cierre mental, ver que se logro y que quedo pendiente |
| **Semanal** | Viernes o domingo | Planificar la siguiente semana, detectar patrones |
| **Mensual** | Ultimo dia del mes | Retrospectiva, ajustar objetivos, ver tendencias |

**Tip:** Genera el resumen diario todos los dias antes de cerrar KIRA. En 2-3 semanas tendras suficientes datos para que los resumenes semanales y mensuales sean realmente utiles.

---

## 8. Google Calendar

### Conectar Google Calendar

1. Ve a **Settings**
2. Busca la seccion de **Google Calendar**
3. Click en **"Conectar"** y autoriza con tu cuenta de Google
4. Una vez conectado, tus eventos aparecen automaticamente en KIRA

### Que se sincroniza

- Los eventos de Google Calendar aparecen en la **Consola Central** junto a tus meetings de KIRA
- Se distinguen por un **punto azul** (Google) vs. **punto morado** (KIRA)
- La sincronizacion es de lectura: KIRA lee tus eventos pero no modifica tu calendario (por ahora)

### Tips de sincronizacion

- Si no ves tus eventos, ve a Settings y reconecta
- Los eventos se refrescan automaticamente al cargar la pagina
- Eventos de todo el dia no aparecen en "Proximos meetings" — solo eventos con hora

---

## 9. Flujo de Trabajo Recomendado

### Rutina matutina (5 minutos)

1. **Abre KIRA** — Consola Central
2. **Revisa** tus tasks del dia y meetings programados
3. **Decide** las 3 tasks mas importantes del dia (idealmente Q1 y Q2)
4. **Marca habitos matutinos** si los completaste
5. Ya tienes el dia claro

### Durante el dia

1. **Antes de trabajar en una task:** abrela y dale play al timer
2. **Al terminar:** para el timer. Mueve la task a "Done" si esta completa
3. **Antes de un meeting:** revisa las notas previas
4. **Despues de un meeting:** marcalo como completado y pega la transcripcion
5. **Habitos:** marcalos conforme los vayas completando

### Cierre del dia (3 minutos)

1. **Revisa** que tasks completaste y cuales quedan
2. **Marca** habitos que te faltaron (o confirma los completados)
3. **Genera** un resumen diario AI en Analytics
4. **Planifica** brevemente las 3 prioridades de manana (muevelas a "To Do")

### Revision semanal (10 minutos, viernes o domingo)

1. **Genera** un resumen semanal AI
2. **Revisa** Analytics > Overview con filtro "Esta semana"
3. **Analiza:** donde fue tu tiempo? fue productivo o solo ocupado?
4. **Limpia** el backlog: elimina tasks que ya no importan
5. **Planifica** las prioridades de la siguiente semana

---

## 10. Tips Avanzados para Power Users

### Maximizar la calidad de datos

KIRA es tan inteligente como los datos que le des. Cuanto mas preciso seas, mejores seran los insights.

**Siempre:**
- Usa el timer en CADA sesion de trabajo (no solo las largas)
- Asigna categoria y proyecto a cada task
- Pon estimaciones de tiempo realistas
- Usa la prioridad de Eisenhower honestamente (no todo es Q1)
- Pega transcripciones de meetings el mismo dia

**Nunca:**
- Dejes el timer corriendo sin trabajar
- Crees tasks sin prioridad (te da datos basura en analytics)
- Ignores los habitos — son la metrica mas honesta de tu consistencia

### Usar prioridades estrategicamente

- **Q1 (Urgente + Importante):** maximo 2-3 al dia. Si tienes mas, algo esta mal.
- **Q2 (Importante, no urgente):** aqui deberia estar el 60-70% de tu trabajo. Deep work, estrategia, crecimiento.
- **Q3 (Urgente, no importante):** delega lo que puedas. Si no puedes, hazlo rapido y sin perfeccionismo.
- **Q4 (Ni urgente ni importante):** elimina. Si esta en Q4, preguntate si realmente necesitas hacerlo.

### Leer Analytics correctamente

**Senales de que vas bien:**
- Tiempo en Q2 > 50% del total
- Tasa de completado > 70%
- Eficiencia entre 80-120%
- Adherencia de habitos > 75%
- Tiempo en meetings < 40% del total

**Senales de alarma:**
- Muchas tasks en Q1 = estas apagando fuegos, necesitas planificar mejor
- Eficiencia < 60% = subestimas constantemente cuanto tardan las cosas
- Adherencia < 50% = tienes demasiados habitos o no son realistas
- Backlog crece mas rapido de lo que completas = estas sobrecomprometido

### Transcripciones: el activo mas valioso

Las transcripciones de meetings son oro puro para KIRA:
- Documentan decisiones tomadas
- Registran compromisos ("Pedro se comprometio a entregar el viernes")
- Capturan contexto que se olvida ("El cliente dijo que su presupuesto maximo es 50K")
- Alimentan la futura knowledge base de KIRA

**Haz de esto un habito no negociable:** meeting termina → marca completado → pega transcripcion.

### Categorias recomendadas para un founder

| Categoria | Que incluye |
|-----------|------------|
| **Deep Work** | Trabajo de concentracion: desarrollo, escritura, estrategia |
| **Operativa** | Admin, emails, gestion diaria |
| **Ventas** | Prospecting, calls, proposals, follow-ups |
| **Meetings** | Tiempo en reuniones (se trackea via meetings tambien) |
| **Aprendizaje** | Lectura, cursos, investigacion |
| **Personal** | Ejercicio, salud, relaciones |

---

## 11. FAQ y Solucion de Problemas

### "No se pudo generar el resumen"
- Asegurate de tener datos en el periodo seleccionado (al menos 1 sesion de trabajo o 1 task)
- Si persiste, recarga la pagina y vuelve a intentar
- Necesitas conexion a internet (KIRA llama a la API de Claude)

### "No veo mis eventos de Google Calendar"
- Ve a Settings y verifica que la conexion esta activa
- Si expiro, reconecta tu cuenta de Google
- Solo se muestran eventos con hora (no eventos de todo el dia)

### "El timer no guarda la sesion"
- Asegurate de hacer click en Stop (no solo cerrar la pagina)
- Si la pagina se recargo durante una sesion, el timer se pierde — usa sesiones cortas (25-50min)

### "Como borro una task?"
- Abre la task > en el menu de opciones puedes eliminarla
- Alternativa: muevela a un estado de "eliminada" o simplemente dejala en backlog y limpia semanalmente

### "Puedo usar KIRA desde el movil?"
- Si. KIRA esta optimizada para mobile. Abre la URL en Safari o Chrome
- Puedes anadirla a la pantalla de inicio: Safari > Compartir > "Anadir a pantalla de inicio"
- Funciona como una app nativa (PWA)

### "Cuantos datos puedo meter?"
- Con Supabase Pro: anos de datos sin problema (8GB de base de datos)
- No te preocupes por el espacio — preocupate por la calidad de los datos

### "KIRA puede leer mis emails/WhatsApp?"
- Todavia no. Esto esta en el roadmap (Fase 3: KIRA Actua)
- Por ahora, la informacion de calls y mensajes entra via transcripciones manuales

---

## Resumen: Las 5 Reglas de Oro de KIRA

1. **Abre KIRA cada manana.** La Consola Central es tu briefing diario.
2. **Usa el timer siempre.** Sin datos de tiempo, Analytics no sirve.
3. **Prioriza con Eisenhower.** Se honesto con Q1 vs Q2. Tu productividad real esta en Q2.
4. **Pega transcripciones el mismo dia.** Es el activo mas valioso a largo plazo.
5. **Genera el resumen diario.** 30 segundos que cierran tu dia con claridad.

---

> Version: 1.0 | Ultima actualizacion: Marzo 2026
> KIRA - Knowledge, Intelligence, Reasoning & Automation
