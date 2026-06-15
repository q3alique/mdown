import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from './index'
import type { Tab } from '../types'

function makeTab(overrides: Partial<Tab> = {}): Tab {
  return {
    id: crypto.randomUUID(),
    type: 'file',
    path: null,
    title: 'test',
    content: '',
    savedContent: '',
    dirty: false,
    lineEnding: 'lf',
    encoding: 'utf8',
    editorState: null,
    frontmatter: null,
    ...overrides,
  }
}

beforeEach(() => {
  // Reset store to initial state between tests
  useAppStore.setState({
    tabs: [],
    activeTabId: null,
    recentFiles: [],
    settings: useAppStore.getInitialState().settings,
    sidebarVisible: true,
    viewMode: 'split',
    quickSwitcherOpen: false,
    headings: [],
    cursorPosition: { line: 1, col: 1, wordCount: 0, charCount: 0 },
  })
})

describe('tabs', () => {
  it('test_004_a: addTab rejects beyond MAX_TABS (8)', () => {
    const store = useAppStore.getState()
    for (let i = 0; i < 9; i++) {
      store.addTab(makeTab({ id: `t${i}`, title: `Tab ${i}` }))
    }
    expect(useAppStore.getState().tabs.length).toBe(8)
  })

  it('test_004_b: updateContent sets dirty=true when content differs', () => {
    const tab = makeTab({ id: 't1', content: '', savedContent: '', dirty: false })
    useAppStore.getState().addTab(tab)
    useAppStore.getState().updateContent('t1', 'new content')
    const updated = useAppStore.getState().tabs.find((t) => t.id === 't1')
    expect(updated?.dirty).toBe(true)
  })

  it('test_004_c: markSaved sets dirty=false', () => {
    const tab = makeTab({ id: 't1', content: 'hello', savedContent: 'old', dirty: true })
    useAppStore.getState().addTab(tab)
    useAppStore.getState().markSaved('t1')
    const updated = useAppStore.getState().tabs.find((t) => t.id === 't1')
    expect(updated?.dirty).toBe(false)
    expect(updated?.savedContent).toBe('hello')
  })

  it('test_004_f: closeTab switches activeTabId to adjacent tab', () => {
    const store = useAppStore.getState()
    store.addTab(makeTab({ id: 'a', title: 'A' }))
    store.addTab(makeTab({ id: 'b', title: 'B' }))
    expect(useAppStore.getState().activeTabId).toBe('b') // last added is active

    store.closeTab('b')
    expect(useAppStore.getState().activeTabId).toBe('a')
  })
})

describe('recent files', () => {
  it('test_004_d: addRecentFile caps at 20 entries', () => {
    const store = useAppStore.getState()
    for (let i = 0; i < 25; i++) {
      store.addRecentFile({ path: `/path/${i}.md`, title: `file${i}`, lastOpened: new Date().toISOString() })
    }
    expect(useAppStore.getState().recentFiles.length).toBe(20)
  })

  it('test_004_e: addRecentFile deduplicates by path', () => {
    const store = useAppStore.getState()
    store.addRecentFile({ path: '/a.md', title: 'A', lastOpened: '2026-01-01' })
    store.addRecentFile({ path: '/b.md', title: 'B', lastOpened: '2026-01-02' })
    store.addRecentFile({ path: '/a.md', title: 'A', lastOpened: '2026-01-03' })
    const files = useAppStore.getState().recentFiles
    expect(files.length).toBe(2)
    expect(files[0].path).toBe('/a.md')
  })
})
