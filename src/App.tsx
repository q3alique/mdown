import { useEffect, useRef, useState, useCallback } from 'react'
import AppLayout from './components/Layout/AppLayout'
import QuickSwitcher from './components/QuickSwitcher'
import { SettingsPanel } from './components/Settings'
import { ExportDialog } from './components/Export'
import { CombinerDialog } from './components/Combiner'
import { useAppInit } from './hooks/useAppInit'
import { useAutoPersist } from './hooks/useAutoPersist'
import { useFileOpen } from './hooks/useFileOpen'
import { useAppStore } from './store'
import { fsWriteFile, saveFileDialog } from './lib/tauri-commands'

export default function App() {
  const quickSwitcherOpen = useAppStore((s) => s.quickSwitcherOpen)
  const setQuickSwitcherOpen = useAppStore((s) => s.setQuickSwitcherOpen)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const setExportDialogOpen = useAppStore((s) => s.setExportDialogOpen)
  const combinerDialogOpen = useAppStore((s) => s.combinerDialogOpen)
  const setCombinerDialogOpen = useAppStore((s) => s.setCombinerDialogOpen)
  const uiTheme = useAppStore((s) => s.settings.uiTheme)
  const { openFileFromPath } = useFileOpen()
  const [dragOver, setDragOver] = useState(false)

  // Stable ref so the drag-drop listener always calls the latest version
  // without re-registering the listener on every tabs state change.
  const openFileRef = useRef<typeof openFileFromPath>(openFileFromPath)
  useEffect(() => { openFileRef.current = openFileFromPath }, [openFileFromPath])

  useAppInit()
  useAutoPersist()

  useEffect(() => {
    useAppStore.getState().initializeScratchTab()
  }, [])

  // ── Save As handler ─────────────────────────────────────────────
  const handleSaveAs = useCallback(async () => {
    const store = useAppStore.getState()
    const tab = store.tabs.find((t) => t.id === store.activeTabId)
    if (!tab) return

    const defaultName = tab.title ? `${tab.title}.md` : 'untitled.md'
    try {
      const newPath = await saveFileDialog({
        title: 'Save As',
        defaultFilename: defaultName,
      })
      if (!newPath) return // user cancelled

      await fsWriteFile(newPath, tab.content, tab.lineEnding)
      store.markSaved(tab.id)
      // Update tab path and title
      const titleFromPath = newPath.split(/[/\\]/).pop()?.replace(/\.md$/i, '') ?? tab.title
      store.updateTabPath(tab.id, newPath, titleFromPath)
      store.setStatusMessage(`Saved as ${titleFromPath}`)
      setTimeout(() => store.setStatusMessage(null), 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      store.setStatusMessage(`Save As failed: ${msg}`)
      console.error('Save As error:', err)
      setTimeout(() => store.setStatusMessage(null), 5000)
    }
  }, [])

  // ── Tauri drag-and-drop (file from OS) ──────────────────────────
  // Register exactly once. The ref above keeps openFileFromPath current
  // without causing this effect to re-run (which would pile up listeners).
  useEffect(() => {
    let unlisten: (() => void) | undefined
    let alive = true

    async function setupDragDrop() {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window')
        const fn = await getCurrentWindow().onDragDropEvent((event) => {
          if (event.payload.type === 'over') {
            setDragOver(true)
          } else if (event.payload.type === 'leave') {
            setDragOver(false)
          } else if (event.payload.type === 'drop') {
            setDragOver(false)
            const paths = event.payload.paths as string[]
            for (const p of paths) {
              openFileRef.current(p)
            }
          }
        })
        if (alive) {
          unlisten = fn
        } else {
          fn() // component unmounted before async resolved — clean up immediately
        }
      } catch {
        // Not in Tauri environment (dev/test) — ignore
      }
    }
    setupDragDrop()

    return () => {
      alive = false
      unlisten?.()
    }
  }, []) // empty deps — register only once

  // ── HTML5 drag-and-drop fallback (browser dev mode only) ────────
  // In a Tauri build the Tauri onDragDropEvent handler above already handles
  // file drops, so we skip this handler entirely to prevent opening each file
  // twice (once per handler).
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

  useEffect(() => {
    if (isTauri) return // Tauri handler covers this

    function onDragOver(e: DragEvent) {
      e.preventDefault()
      setDragOver(true)
    }
    function onDragLeave(e: DragEvent) {
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setDragOver(false)
      }
    }
    function onDrop(e: DragEvent) {
      e.preventDefault()
      setDragOver(false)
      const files = Array.from(e.dataTransfer?.files ?? [])
      for (const file of files) {
        if (file.name.toLowerCase().endsWith('.md')) {
          file.text().then((content) => {
            const store = useAppStore.getState()
            // Avoid duplicate tabs (same filename)
            if (store.tabs.some((t) => t.path === file.name)) {
              store.setActiveTab(store.tabs.find((t) => t.path === file.name)!.id)
              return
            }
            const id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)
            const title = file.name.replace(/\.md$/i, '')
            store.addTab({
              id,
              type: 'file',
              path: file.name,
              title,
              content,
              savedContent: content,
              dirty: false,
              lineEnding: 'lf',
              encoding: 'utf8',
              editorState: null,
              frontmatter: null,
            })
          }).catch(() => {})
        }
      }
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [isTauri])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        setQuickSwitcherOpen(!quickSwitcherOpen)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setSettingsOpen(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault()
        setExportDialogOpen(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        setCombinerDialogOpen(!combinerDialogOpen)
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        handleSaveAs()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [quickSwitcherOpen, setQuickSwitcherOpen, setSettingsOpen, setExportDialogOpen, combinerDialogOpen, setCombinerDialogOpen, handleSaveAs])

  return (
    <div className="relative" data-ui-theme={uiTheme}>
      {/* Drag-over overlay */}
      {dragOver && (
        <div className="fixed inset-0 z-50 bg-blue-900/30 border-4 border-dashed border-blue-400 flex items-center justify-center pointer-events-none">
          <div className="bg-gray-900/80 px-8 py-4 rounded-lg shadow-xl">
            <p className="text-blue-300 text-lg font-medium">Drop .md files to open</p>
          </div>
        </div>
      )}

      <AppLayout />
      {quickSwitcherOpen && <QuickSwitcher />}
      <SettingsPanel />
      <ExportDialog />
      <CombinerDialog />
    </div>
  )
}
