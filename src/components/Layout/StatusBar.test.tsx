import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useAppStore } from '../../store'
import StatusBar from './StatusBar'

beforeEach(() => {
  useAppStore.setState({
    cursorPosition: { line: 3, col: 5, wordCount: 142, charCount: 0 },
  })
})

describe('StatusBar', () => {
  it('test_002_c: displays filename, word count, and cursor position from store', () => {
    render(<StatusBar filename="readme.md" />)
    expect(screen.getByTestId('status-filename')).toHaveTextContent('readme.md')
    expect(screen.getByTestId('status-wordcount')).toHaveTextContent('142 words')
    expect(screen.getByTestId('status-cursor')).toHaveTextContent('Ln 3, Col 5')
  })
})
