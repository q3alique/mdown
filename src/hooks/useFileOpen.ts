import { useCallback } from 'react'
import { useAppStore } from '../store'
import { fsReadFile, openFileDialog } from '../lib/tauri-commands'
import type { Tab } from '../types'

// ── Simple UUID v4 generator (no external dependency) ───────────────

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

// ── Parse filename + extension from a path ──────────────────────────

function parsePath(path: string): { title: string; ext: string } {
  const parts = path.replace(/\\/g, '/').split('/')
  const basename = parts[parts.length - 1] ?? 'untitled'
  const dotIdx = basename.lastIndexOf('.')
  if (dotIdx > 0) {
    return { title: basename.slice(0, dotIdx), ext: basename.slice(dotIdx) }
  }
  return { title: basename, ext: '' }
}

// ── Hook ────────────────────────────────────────────────────────────

export function useFileOpen() {
  const addTab = useAppStore((s) => s.addTab)
  const addRecentFile = useAppStore((s) => s.addRecentFile)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const tabs = useAppStore((s) => s.tabs)
  const setStatusMessage = useAppStore((s) => s.setStatusMessage)

  const openFileFromPath = useCallback(
    async (path: string) => {
      // Normalize path separators
      const normalizedPath = path.replace(/\\/g, '/')

      // Validate: must be .md
      if (!normalizedPath.toLowerCase().endsWith('.md')) {
        setStatusMessage(`Cannot open "${parsePath(normalizedPath).title}" — only .md files are supported`)
        setTimeout(() => setStatusMessage(null), 4000)
        return
      }

      // Check if already open in a tab
      const existing = tabs.find((t) => t.path && t.path.replace(/\\/g, '/') === normalizedPath)
      if (existing) {
        setActiveTab(existing.id)
        return
      }

      // Read file from disk
      let result
      try {
        result = await fsReadFile(normalizedPath)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        setStatusMessage(`Could not open file: ${msg}`)
        setTimeout(() => setStatusMessage(null), 5000)
        return
      }

      const { content, original_line_ending } = result
      const lineEnding = original_line_ending === 'crlf' ? 'crlf' : 'lf'
      const { title } = parsePath(normalizedPath)

      // Check tab limit
      if (tabs.length >= 8) {
        setStatusMessage('Maximum 8 tabs open. Close a tab to open another file.')
        setTimeout(() => setStatusMessage(null), 4000)
        return
      }

      const newTab: Tab = {
        id: uuidv4(),
        type: 'file',
        path: normalizedPath,
        title,
        content,
        savedContent: content,
        dirty: false,
        lineEnding,
        encoding: 'utf8',
        editorState: null,
        frontmatter: null,
      }

      addTab(newTab)
      addRecentFile({
        path: normalizedPath,
        title,
        lastOpened: new Date().toISOString(),
      })
    },
    [addTab, addRecentFile, setActiveTab, tabs, setStatusMessage],
  )

  const openFileFromDialog = useCallback(async () => {
    try {
      const result = await openFileDialog({ title: 'Open Markdown File' })
      if (!result) return // user cancelled
      const paths = Array.isArray(result) ? result : [result]
      for (const p of paths) {
        await openFileFromPath(p)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setStatusMessage(`File dialog error: ${msg}`)
      setTimeout(() => setStatusMessage(null), 5000)
    }
  }, [openFileFromPath, setStatusMessage])

  return { openFileFromPath, openFileFromDialog }
}
