import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TabBar from './TabBar'
import type { Tab } from '../../types'

const tabs: Tab[] = [
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
  },
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
  },
]

describe('TabBar', () => {
  it('test_002_a: renders both tabs; active tab has distinct styling; scratch tab has no close button', () => {
    render(
      <TabBar
        tabs={tabs}
        activeTabId="1"
        onTabClick={() => {}}
        onTabClose={() => {}}
      />
    )

    // Both tab titles visible
    expect(screen.getByText('readme')).toBeInTheDocument()
    expect(screen.getByText('Scratch')).toBeInTheDocument()

    // Active tab (id='1') has bg-gray-700 class
    const activeTab = screen.getByTestId('tab-1')
    expect(activeTab.className).toContain('bg-gray-700')

    // Inactive tab (id='scratch') has bg-gray-800 class
    const inactiveTab = screen.getByTestId('tab-scratch')
    expect(inactiveTab.className).toContain('bg-gray-800')

    // Scratch tab has NO close button
    expect(screen.queryByTestId('close-scratch')).toBeNull()

    // File tab has a close button
    expect(screen.getByTestId('close-1')).toBeInTheDocument()
  })

  it('test_002_b: clicking close button calls onTabClose with correct id', () => {
    const onTabClose = vi.fn()

    render(
      <TabBar
        tabs={tabs}
        activeTabId="1"
        onTabClick={() => {}}
        onTabClose={onTabClose}
      />
    )

    fireEvent.click(screen.getByTestId('close-1'))
    expect(onTabClose).toHaveBeenCalledWith('1')
  })
})
