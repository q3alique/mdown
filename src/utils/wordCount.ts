/**
 * Count words in Markdown content, stripping syntax elements:
 * 1. Remove YAML frontmatter (lines between first "---" delimiters)
 * 2. Remove fenced code blocks (``` ... ```)
 * 3. Remove inline code (` ... `)
 * 4. Remove HTML tags
 * 5. Split on whitespace, count non-empty tokens
 */
export function countWords(markdown: string): number {
  let text = markdown

  // 1. Remove YAML frontmatter
  text = text.replace(/^---[\s\S]*?---\n?/, '')

  // 2. Remove fenced code blocks
  text = text.replace(/```[\s\S]*?```/g, '')

  // 3. Remove inline code
  text = text.replace(/`[^`]*`/g, '')

  // 4. Remove HTML tags
  text = text.replace(/<[^>]*>/g, '')

  // 5. Split on whitespace, count non-empty
  const tokens = text.split(/\s+/).filter(Boolean)
  return tokens.length
}
