import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useAppStore } from '../../store'
import type { Tab } from '../../types'
import AppLayout from './AppLayout'

function seedStore() {
  useAppStore.setState({
    tabs: [
      {
        id: '1',
        type: 'file',
        path: 'C:/docs/readme.md',
        title: 'readme',
        content: '',
        savedContent: '',
        dirty: false,
        lineEnding: 'lf',
        encoding: 'utf8',
        editorState: null,
        frontmatter: null,
      } as Tab,
      {
        id: 'scratch',
        type: 'scratch',
        path: null,
        title: 'Scratch',
        content: '',
        savedContent: '',
        dirty: true,
        lineEnding: 'lf',
        encoding: 'utf8',
        editorState: null,
        frontmatter: null,
      } as Tab,
    ],
    activeTabId: '1',
    recentFiles: [],
    settings: useAppStore.getInitialState().settings,
    sidebarVisible: true,
    viewMode: 'split',
    quickSwitcherOpen: false,
    headings: [],
  })
}

beforeEach(() => {
  useAppStore.setState({
    tabs: [],
    activeTabId: null,
    recentFiles: [],
    settings: useAppStore.getInitialState().settings,
    sidebarVisible: true,
    viewMode: 'split',
    quickSwitcherOpen: false,
    headings: [],
    cursorPosition: { line: 3, col: 5, wordCount: 142, charCount: 0 },
  })
})

describe('AppLayout', () => {
  it('renders the full layout with all zones', () => {
    seedStore()
    render(<AppLayout />)

    // Tab bar
    expect(screen.getByText('readme')).toBeInTheDocument()
    expect(screen.getByText('Scratch')).toBeInTheDocument()
    // Sidebar
    expect(screen.getByText('MDown')).toBeInTheDocument()
    expect(screen.getByText('Outline')).toBeInTheDocument()
    // Status bar
    expect(screen.getByTestId('status-filename')).toHaveTextContent('readme.md')
    expect(screen.getByTestId('status-wordcount')).toHaveTextContent('142 words')
    expect(screen.getByTestId('status-cursor')).toHaveTextContent('Ln 3, Col 5')
  })
})
