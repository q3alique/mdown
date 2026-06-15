import { create } from 'zustand'
import type { EditorView } from '@codemirror/view'
import type { Tab, RecentFile, AppSettings, ViewMode, Heading, CursorPosition } from '../types'
import { DEFAULT_SETTINGS } from '../types'

const MAX_TABS = 8
const MAX_RECENT_FILES = 20

export interface AppStore {
  // Tabs
  tabs: Tab[]
  activeTabId: string | null
  addTab: (tab: Tab) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateContent: (id: string, content: string) => void
  markSaved: (id: string) => void
  updateTabPath: (id: string, newPath: string, newTitle: string) => void
  reorderTabs: (fromIndex: number, toIndex: number) => void

  // Recent files
  recentFiles: RecentFile[]
  addRecentFile: (file: RecentFile) => void
  removeRecentFile: (path: string) => void

  // Settings
  settings: AppSettings
  updateSettings: (partial: Partial<AppSettings>) => void

  // UI state
  sidebarVisible: boolean
  toggleSidebar: () => void
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  quickSwitcherOpen: boolean
  setQuickSwitcherOpen: (open: boolean) => void
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  exportDialogOpen: boolean
  setExportDialogOpen: (open: boolean) => void
  combinerDialogOpen: boolean
  setCombinerDialogOpen: (open: boolean) => void
  headings: Heading[]
  setHeadings: (headings: Heading[]) => void

  // Cursor position for status bar
  cursorPosition: CursorPosition
  updateCursorPosition: (pos: CursorPosition) => void

  // Scratch pad
  scratchContent: string
  setScratchContent: (content: string) => void
  initializeScratchTab: () => void

  // Status bar message
  statusMessage: string | null
  setStatusMessage: (message: string | null) => void

  // Live CodeMirror view — used for content-based scroll sync (line geometry).
  // Not persisted and intentionally read imperatively (no reactive subscribers)
  // so storing it never triggers re-renders.
  editorView: EditorView | null
  setEditorView: (view: EditorView | null) => void
}

export const useAppStore = create<AppStore>()((set, get) => ({
  // ── Tabs ──────────────────────────────────────────────────────────

  tabs: [],
  activeTabId: null,

  addTab: (tab: Tab) => {
    const { tabs } = get()
    if (tabs.length >= MAX_TABS) {
      console.error(`Max ${MAX_TABS} tabs reached — cannot add "${tab.title}"`)
      return
    }
    set({ tabs: [...tabs, tab], activeTabId: tab.id })
  },

  closeTab: (id: string) => {
    if (id === 'scratch') return
    const { tabs, activeTabId } = get()
    const idx = tabs.findIndex((t) => t.id === id)
    if (idx === -1) return
    const newTabs = tabs.filter((t) => t.id !== id)
    let newActive = activeTabId
    if (activeTabId === id) {
      if (newTabs.length === 0) {
        newActive = null
      } else if (idx < newTabs.length) {
        newActive = newTabs[idx].id
      } else {
        newActive = newTabs[newTabs.length - 1].id
      }
    }
    set({ tabs: newTabs, activeTabId: newActive })
  },

  setActiveTab: (id: string) => {
    set({ activeTabId: id })
  },

  updateContent: (id: string, content: string) => {
    set({
      tabs: get().tabs.map((t) =>
        t.id === id ? { ...t, content, dirty: content !== t.savedContent } : t,
      ),
    })
  },

  markSaved: (id: string) => {
    set({
      tabs: get().tabs.map((t) =>
        t.id === id ? { ...t, savedContent: t.content, dirty: false } : t,
      ),
    })
  },

  updateTabPath: (id: string, newPath: string, newTitle: string) => {
    set({
      tabs: get().tabs.map((t) =>
        t.id === id ? { ...t, path: newPath, title: newTitle } : t,
      ),
    })
  },

  reorderTabs: (fromIndex: number, toIndex: number) => {
    const tabs = [...get().tabs]
    if (fromIndex < 0 || fromIndex >= tabs.length || toIndex < 0 || toIndex >= tabs.length) return
    const [moved] = tabs.splice(fromIndex, 1)
    tabs.splice(toIndex, 0, moved)
    set({ tabs })
  },

  // ── Recent files ──────────────────────────────────────────────────

  recentFiles: [],

  addRecentFile: (file: RecentFile) => {
    set({
      recentFiles: [file, ...get().recentFiles.filter((f) => f.path !== file.path)].slice(
        0,
        MAX_RECENT_FILES,
      ),
    })
  },

  removeRecentFile: (path: string) => {
    set({ recentFiles: get().recentFiles.filter((f) => f.path !== path) })
  },

  // ── Settings ──────────────────────────────────────────────────────

  settings: { ...DEFAULT_SETTINGS },

  updateSettings: (partial: Partial<AppSettings>) => {
    set({ settings: { ...get().settings, ...partial } })
  },

  // ── UI state ──────────────────────────────────────────────────────

  sidebarVisible: true,

  toggleSidebar: () => {
    set({ sidebarVisible: !get().sidebarVisible })
  },

  viewMode: 'split',

  setViewMode: (mode: ViewMode) => {
    set({ viewMode: mode })
  },

  quickSwitcherOpen: false,

  setQuickSwitcherOpen: (open: boolean) => {
    set({ quickSwitcherOpen: open })
  },

  settingsOpen: false,

  setSettingsOpen: (open: boolean) => {
    set({ settingsOpen: open })
  },

  exportDialogOpen: false,

  setExportDialogOpen: (open: boolean) => {
    set({ exportDialogOpen: open })
  },

  combinerDialogOpen: false,

  setCombinerDialogOpen: (open: boolean) => {
    set({ combinerDialogOpen: open })
  },

  headings: [],

  setHeadings: (headings: Heading[]) => {
    set({ headings })
  },

  // ── Cursor position ───────────────────────────────────────────────

  cursorPosition: { line: 1, col: 1, wordCount: 0, charCount: 0 },

  updateCursorPosition: (pos: CursorPosition) => {
    set({ cursorPosition: pos })
  },

  // ── Scratch pad ───────────────────────────────────────────────────

  scratchContent: '',

  setScratchContent: (content: string) => {
    set({
      scratchContent: content,
      tabs: get().tabs.map((t) =>
        t.id === 'scratch' ? { ...t, content, savedContent: content, dirty: false } : t,
      ),
    })
  },

  initializeScratchTab: () => {
    const { tabs, scratchContent } = get()
    if (tabs.some((t) => t.id === 'scratch')) return
    set({
      tabs: [
        ...tabs,
        {
          id: 'scratch',
          type: 'scratch',
          path: null,
          title: 'Scratch',
          content: scratchContent,
          savedContent: scratchContent,
          dirty: false,
          lineEnding: 'lf',
          encoding: 'utf8',
          editorState: null,
          frontmatter: null,
        },
      ],
    })
  },

  // ── Status bar message ────────────────────────────────────────────

  statusMessage: null,

  setStatusMessage: (message: string | null) => {
    set({ statusMessage: message })
  },

  // ── Editor view (for scroll sync) ─────────────────────────────────

  editorView: null,

  setEditorView: (view: EditorView | null) => {
    set({ editorView: view })
  },
}))
