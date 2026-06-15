// ── Core tab type ──────────────────────────────────────────────────

export interface Tab {
  id: string              // UUID, generated on open
  type: 'file' | 'scratch'
  path: string | null     // absolute path on disk; null for scratch pad
  title: string           // display name
  content: string         // current editor content (may differ from disk)
  savedContent: string    // content at last save (for dirty detection)
  dirty: boolean          // content !== savedContent
  lineEnding: 'lf' | 'crlf'
  encoding: 'utf8' | 'utf8-bom' | 'utf16'
  editorState: unknown    // CodeMirror EditorState
  frontmatter: FrontmatterData | null
}

export interface FrontmatterData {
  title?: string
  author?: string
  date?: string
  description?: string
  [key: string]: string | undefined
}

export interface Heading {
  id: string
  text: string
  level: number     // 1–4
  offset: number    // character offset in source Markdown
}

export interface RecentFile {
  path: string
  title: string
  lastOpened: string    // ISO 8601
}

export interface CursorPosition {
  line: number      // 1-indexed
  col: number       // 1-indexed
  wordCount: number
  charCount: number
}

// ── Tauri file command types ───────────────────────────────────────

export interface FileReadResult {
  content: string
  original_encoding: string
  original_line_ending: string
  size_bytes: number
}

export interface FileError {
  code: string
  message: string
  path: string
}

// ── Export types ───────────────────────────────────────────────────

export type TemplateName = 'slate' | 'linen' | 'scholar'
export type PageSize = 'A4' | 'Letter'

// ── View mode ──────────────────────────────────────────────────────

export type ViewMode = 'split' | 'editor' | 'preview'

// ── App settings ───────────────────────────────────────────────────

export interface AppSettings {
  fontSize: number          // 10–32
  lineNumbers: boolean
  wordWrap: boolean
  tabSize: number           // 2, 4, 8
  uiTheme: 'dark' | 'light'
  editorTheme: 'one-dark' | 'github-light'
  defaultTemplate: 'slate' | 'linen' | 'scholar'
  defaultPageSize: 'A4' | 'Letter' | 'A3'
  previewWidth: 'normal' | 'wide' | 'full'
  sidebarVisible: boolean
  defaultView: ViewMode
}

export const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 14,
  lineNumbers: true,
  wordWrap: true,
  tabSize: 2,
  uiTheme: 'dark',
  editorTheme: 'one-dark',
  defaultTemplate: 'slate',
  defaultPageSize: 'A4',
  previewWidth: 'normal',
  sidebarVisible: true,
  defaultView: 'split',
}

// ── Window state (for persistence) ──────────────────────────────────

export interface WindowState {
  x: number
  y: number
  width: number
  height: number
  maximized: boolean
}
