import { create } from 'zustand'
import type { Task, Category, Project, Tag } from '@/types/task'

type TaskView = 'list' | 'kanban' | 'feed' | 'calendar' | 'category' | 'project'

export type DateRange = '' | 'today' | 'tomorrow' | 'yesterday' | 'this_week' | 'next_week' | 'this_month' | 'overdue' | 'no_date'

interface TaskFilters {
  status: string[]
  category: string[]
  project: string
  priority: string[]
  search: string
  dateRange: DateRange
}

interface TaskStore {
  tasks: Task[]
  categories: Category[]
  projects: Project[]
  tags: Tag[]
  view: TaskView
  filters: TaskFilters
  loading: boolean

  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, data: Partial<Task>) => void
  removeTask: (id: string) => void
  setCategories: (categories: Category[]) => void
  addCategory: (category: Category) => void
  removeCategory: (id: string) => void
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (id: string, data: Partial<Project>) => void
  removeProject: (id: string) => void
  setTags: (tags: Tag[]) => void
  addTag: (tag: Tag) => void
  removeTag: (id: string) => void
  setView: (view: TaskView) => void
  setFilter: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void
  resetFilters: () => void
  setLoading: (loading: boolean) => void
}

const defaultFilters: TaskFilters = {
  status: [],
  category: [],
  project: '',
  priority: [],
  search: '',
  dateRange: '',
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  categories: [],
  projects: [],
  tags: [],
  view: 'list',
  filters: { ...defaultFilters },
  loading: false,

  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
  updateTask: (id, data) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
    })),
  removeTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  setCategories: (categories) => set({ categories }),
  addCategory: (category) =>
    set((s) => ({ categories: [...s.categories, category] })),
  removeCategory: (id) =>
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),
  setProjects: (projects) => set({ projects }),
  addProject: (project) =>
    set((s) => ({ projects: [...s.projects, project] })),
  updateProject: (id, data) =>
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...data } : p)),
    })),
  removeProject: (id) =>
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
  setTags: (tags) => set({ tags }),
  addTag: (tag) => set((s) => ({ tags: [...s.tags, tag] })),
  removeTag: (id) => set((s) => ({ tags: s.tags.filter((t) => t.id !== id) })),
  setView: (view) => set({ view }),
  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),
  setLoading: (loading) => set({ loading }),
}))
