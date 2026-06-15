import { useEffect, useRef } from 'react'
import { useAppStore } from '../store'
import { loadPersistedState } from '../store/persistence'
import { fsReadFile } from '../lib/tauri-commands'
import type { Tab } from '../types'

/**
 * Called once on app startup to restore session: recent files, settings,
 * scratch pad, and previously-opened tabs.
 */
export function useAppInit() {
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    ;(async () => {
      try {
        const persisted = await loadPersistedState()
        const store = useAppStore.getState()

        // 1. Apply persisted settings
        if (Object.keys(persisted.settings).length > 0) {
          store.updateSettings(persisted.settings)
        }

        // 2. Restore recent files
        for (const f of persisted.recentFiles) {
          store.addRecentFile(f)
        }

        // 3. Restore scratch content from persistence
        store.setScratchContent(persisted.scratchContent)

        // 4. Re-open session tabs (files from previous session)
        for (const filePath of persisted.sessionTabs) {
          try {
            const result = await fsReadFile(filePath)
            const pathObj = new URL(filePath.startsWith('file://') ? filePath : `file://${filePath}`)
            const segments = pathObj.pathname.replace(/\\/g, '/').split('/').filter(Boolean)
            const fileName = segments.pop() ?? 'untitled'
            const title = fileName.replace(/\.md$/i, '')

            store.addTab({
              id: crypto.randomUUID(),
              type: 'file',
              path: filePath,
              title,
              content: result.content,
              savedContent: result.content,
              dirty: false,
              lineEnding: result.original_line_ending as 'lf' | 'crlf',
              encoding: result.original_encoding as 'utf8' | 'utf8-bom' | 'utf16',
              editorState: null,
              frontmatter: null,
            } as Tab)
          } catch {
            // File no longer exists or can't be read — skip silently
          }
        }

        // 5. Ensure at least the scratch tab exists (idempotent — no-op if already present)
        store.initializeScratchTab()
      } catch (err) {
        console.error('useAppInit: failed to restore session', err)
      }
    })()
  }, [])
}
