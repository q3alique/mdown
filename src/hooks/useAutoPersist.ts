import { useEffect, useRef } from 'react'
import { useAppStore } from '../store'
import { persistRecentFiles, persistSessionTabs, persistScratchContent, persistSettings } from '../store/persistence'

const DEBOUNCE_MS = 1000

/**
 * Subscribes to Zustand store changes and automatically persists
 * recent files, session tab paths, scratch content, and settings
 * after a 1-second debounce.
 *
 * Tab *content* is NOT auto-persisted — it is saved explicitly via Ctrl+S.
 */
export function useAutoPersist() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const unsub = useAppStore.subscribe((state) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        // Recent files
        persistRecentFiles(state.recentFiles).catch(console.error)

        // Session tab paths (exclude scratch)
        const fileTabs = state.tabs.filter((t) => t.type === 'file' && t.path)
        persistSessionTabs(
          fileTabs.map((t) => t.path!),
          state.activeTabId,
        ).catch(console.error)

        // Scratch content
        const scratch = state.tabs.find((t) => t.id === 'scratch')
        if (scratch) {
          persistScratchContent(scratch.content).catch(console.error)
        }

        // Settings
        persistSettings(state.settings).catch(console.error)
      }, DEBOUNCE_MS)
    })

    return () => {
      if (timer.current) clearTimeout(timer.current)
      unsub()
    }
  }, [])
}
