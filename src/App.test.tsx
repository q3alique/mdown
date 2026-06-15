import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useAppStore } from './store'
import type { Tab } from './types'
import App from './App'

beforeEach(() => {
  useAppStore.setState({
    tabs: [],
    activeTabId: null,
    recentFiles: [],
    settings: useAppStore.getInitialState().settings,
    sidebarVisible: true,
    viewMode: 'split',
    quickSwitcherOpen: false,
    combinerDialogOpen: false,
    exportDialogOpen: false,
    settingsOpen: false,
    scratchContent: '',
    headings: [],
    cursorPosition: { line: 1, col: 1, wordCount: 0, charCount: 0 },
  })
})

describe('App', () => {
  it('test_001_a: renders MDown heading', () => {
    // Seed some tabs so layout renders
    useAppStore.setState({
      tabs: [
        {
          id: '1',
          type: 'file',
          path: 'C:/test.md',
          title: 'test',
          content: '',
          savedContent: '',
          dirty: false,
          lineEnding: 'lf',
          encoding: 'utf8',
          editorState: null,
          frontmatter: null,
        } as Tab,
      ],
      activeTabId: '1',
    })
    render(<App />)
    expect(screen.getByText('MDown')).toBeInTheDocument()
  })

  it('test_001_b: initial render does not crash', () => {
    // With no file tabs, shows scratch tab + placeholder
    render(<App />)
    expect(screen.getByTestId('tab-scratch')).toBeInTheDocument()
    expect(screen.getByText('No tabs open. Open a file to get started.')).toBeInTheDocument()
  })
})
