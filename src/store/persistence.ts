import { Store } from '@tauri-apps/plugin-store'
import type { RecentFile, AppSettings, WindowState } from '../types'

let store: Store | null = null

async function getStore(): Promise<Store> {
  if (!store) {
    store = await Store.load('mdown-store.json')
  }
  return store
}

// ── Load ────────────────────────────────────────────────────────────

export interface PersistedState {
  recentFiles: RecentFile[]
  sessionTabs: string[]           // paths only
  activeTabPath: string | null
  scratchContent: string
  settings: Partial<AppSettings>
  windowState: WindowState | null
}

export async function loadPersistedState(): Promise<PersistedState> {
  const s = await getStore()
  const recentFiles: RecentFile[] = (await s.get<RecentFile[]>('recentFiles')) ?? []
  const sessionTabs: string[] = (await s.get<string[]>('sessionTabs')) ?? []
  const activeTabPath: string | null = (await s.get<string | null>('activeTabPath')) ?? null
  const scratchContent: string = (await s.get<string>('scratchContent')) ?? ''
  const settings: Partial<AppSettings> = (await s.get<Partial<AppSettings>>('settings')) ?? {}
  const windowState: WindowState | null = (await s.get<WindowState | null>('windowState')) ?? null
  return { recentFiles, sessionTabs, activeTabPath, scratchContent, settings, windowState }
}

// ── Persist helpers (fire-and-forget) ───────────────────────────────

export async function persistRecentFiles(files: RecentFile[]): Promise<void> {
  const s = await getStore()
  await s.set('recentFiles', files)
  await s.save()
}

export async function persistSessionTabs(paths: string[], activePath: string | null): Promise<void> {
  const s = await getStore()
  await s.set('sessionTabs', paths)
  await s.set('activeTabPath', activePath)
  await s.save()
}

export async function persistScratchContent(content: string): Promise<void> {
  const s = await getStore()
  await s.set('scratchContent', content)
  await s.save()
}

export async function persistSettings(settings: AppSettings): Promise<void> {
  const s = await getStore()
  await s.set('settings', settings)
  await s.save()
}

export async function persistWindowState(state: WindowState): Promise<void> {
  const s = await getStore()
  await s.set('windowState', state)
  await s.save()
}
