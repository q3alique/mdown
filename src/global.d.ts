// Type declarations for untyped markdown-it plugins
declare module 'markdown-it-footnote' {
  import type MarkdownIt from 'markdown-it'
  const plugin: (md: MarkdownIt) => void
  export default plugin
}

declare module 'markdown-it-anchor' {
  import type MarkdownIt from 'markdown-it'
  interface AnchorOptions {
    permalink?: PermalinkOptions
    tabIndex?: boolean
    level?: number | number[]
  }
  interface PermalinkOptions {
    headerLink?: (opts: { class?: string }) => unknown
    linkInsideHeader?: (opts: { symbol?: string; placement?: string }) => unknown
  }
  const anchor: {
    (md: MarkdownIt, opts?: AnchorOptions): void
    permalink: {
      headerLink: (opts: { class?: string }) => unknown
      linkInsideHeader: (opts: { symbol?: string; placement?: string }) => unknown
    }
  }
  export default anchor
}
