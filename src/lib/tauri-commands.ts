import { invoke } from '@tauri-apps/api/core'
import type { FileReadResult, FileError } from '../types'

export const fsReadFile = (path: string) =>
  invoke<FileReadResult>('fs_read_file', { path })

export const fsWriteFile = (path: string, content: string, lineEnding: 'lf' | 'crlf') =>
  invoke<void>('fs_write_file', { path, content, lineEnding })

export const openFileDialog = (opts?: { title?: string; multiple?: boolean }) =>
  invoke<string | string[] | null>('open_file_dialog', opts ?? {})

export const saveFileDialog = (opts?: {
  title?: string
  defaultFilename?: string
  filterName?: string
  filterExtensions?: string[]
}) =>
  invoke<string | null>('save_file_dialog', opts ?? {})

export const watchFile = (path: string, watcherId: string) =>
  invoke<void>('watch_file', { path, watcherId })

export const unwatchFile = (watcherId: string) =>
  invoke<void>('unwatch_file', { watcherId })

export type { FileReadResult, FileError }
