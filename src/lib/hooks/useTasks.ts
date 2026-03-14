'use client'

import { useEffect, useCallback } from 'react'
import { useTaskStore } from '@/stores/taskStore'
import { createClient } from '@/lib/supabase/client'
import { getUserId } from '@/lib/supabase/getUserId'
import { IS_DEMO, demoId } from '@/lib/demo'
import type { Task } from '@/types/task'

const DEMO_CATEGORIES = [
  { id: 'cat-1', user_id: 'demo', name: 'Development', is_default: true, created_at: new Date().toISOString() },
  { id: 'cat-2', user_id: 'demo', name: 'Security', is_default: true, created_at: new Date().toISOString() },
  { id: 'cat-3', user_id: 'demo', name: 'Growth', is_default: true, created_at: new Date().toISOString() },
  { id: 'cat-4', user_id: 'demo', name: 'Admin', is_default: true, created_at: new Date().toISOString() },
  { id: 'cat-5', user_id: 'demo', name: 'Personal', is_default: true, created_at: new Date().toISOString() },
]

export function useTasks() {
  const {
    tasks,
    categories,
    projects,
    tags,
    loading,
    setTasks,
    addTask,
    updateTask,
    removeTask,
    setCategories,
    setProjects,
    setTags,
    setLoading,
  } = useTaskStore()

  const supabase = IS_DEMO ? null : createClient()

  const fetchAll = useCallback(async () => {
    setLoading(true)

    if (IS_DEMO) {
      // Load from localStorage in demo mode
      const saved = localStorage.getItem('kira_demo_tasks')
      if (saved) setTasks(JSON.parse(saved))
      setCategories(DEMO_CATEGORIES)

      const savedProjects = localStorage.getItem('kira_demo_projects')
      if (savedProjects) setProjects(JSON.parse(savedProjects))

      const savedTags = localStorage.getItem('kira_demo_tags')
      if (savedTags) setTags(JSON.parse(savedTags))

      setLoading(false)
      return
    }

    const [tasksRes, catsRes, projsRes, tagsRes] = await Promise.all([
      supabase!.from('tasks').select('*').neq('status', 'deleted').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
      supabase!.from('categories').select('*').order('is_default', { ascending: false }),
      supabase!.from('projects').select('*').eq('is_archived', false).order('name'),
      supabase!.from('tags').select('*').order('name'),
    ])

    if (tasksRes.data) setTasks(tasksRes.data)
    if (catsRes.data) setCategories(catsRes.data)
    if (projsRes.data) setProjects(projsRes.data)
    if (tagsRes.data) setTags(tagsRes.data)
    setLoading(false)
  }, [supabase, setTasks, setCategories, setProjects, setTags, setLoading])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Persist demo data to localStorage
  const persistDemo = useCallback((updatedTasks?: Task[]) => {
    if (!IS_DEMO) return
    const current = updatedTasks || useTaskStore.getState().tasks
    localStorage.setItem('kira_demo_tasks', JSON.stringify(current))
  }, [])

  const createTask = useCallback(
    async (data: Partial<Task>) => {
      if (IS_DEMO) {
        const task: Task = {
          id: demoId(),
          user_id: 'demo',
          title: data.title || '',
          description: data.description || null,
          category_id: data.category_id || null,
          project_id: data.project_id || null,
          priority: data.priority || null,
          status: data.status || 'backlog',
          estimated_mins: data.estimated_mins || null,
          due_date: data.due_date || null,
          tags: data.tags || [],
          kira_score: null,
          notes: data.notes || null,
          difficulty: null,
          post_notes: null,
          meeting_id: data.meeting_id || null,
          parent_task_id: data.parent_task_id || null,
          sort_order: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: null,
        }
        addTask(task)
        setTimeout(persistDemo, 0)
        return task
      }

      const userId = await getUserId()
      const { data: task, error } = await supabase!.from('tasks').insert({ ...data, user_id: userId }).select().single()
      if (error || !task) return null
      addTask(task)
      return task
    },
    [supabase, addTask, persistDemo]
  )

  const editTask = useCallback(
    async (id: string, data: Partial<Task>) => {
      if (IS_DEMO) {
        updateTask(id, { ...data, updated_at: new Date().toISOString() })
        setTimeout(persistDemo, 0)
        return
      }

      const { error } = await supabase!.from('tasks').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id)
      if (!error) updateTask(id, data)
    },
    [supabase, updateTask, persistDemo]
  )

  const deleteTask = useCallback(
    async (id: string) => {
      if (IS_DEMO) {
        removeTask(id)
        setTimeout(persistDemo, 0)
        return
      }

      await supabase!.from('tasks').update({ status: 'deleted', updated_at: new Date().toISOString() }).eq('id', id)
      removeTask(id)
    },
    [supabase, removeTask, persistDemo]
  )

  const completeTask = useCallback(
    async (id: string, postData: { difficulty?: 'easier' | 'as_expected' | 'harder'; post_notes?: string }) => {
      const update = {
        status: 'done' as const,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...postData,
      }

      if (IS_DEMO) {
        updateTask(id, update)
        setTimeout(persistDemo, 0)
        return
      }

      await supabase!.from('tasks').update(update).eq('id', id)
      updateTask(id, update)
    },
    [supabase, updateTask, persistDemo]
  )

  return {
    tasks,
    categories,
    projects,
    tags,
    loading,
    createTask,
    editTask,
    deleteTask,
    completeTask,
    refetch: fetchAll,
  }
}
