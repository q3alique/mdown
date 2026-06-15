---
title: Code & Technical Writing
author: q3alique
date: 2026-06-15
tags: [code, syntax-highlighting, reference]
---

# Code & Technical Writing

MDown highlights fenced code blocks with **highlight.js**. Here are a handful of
languages, plus the kind of structure you'd use in technical docs.

## JavaScript

```javascript
// Debounce a function so it only fires after a quiet period.
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const savePreview = debounce(() => render(editor.value), 150);
```

## Python

```python
from dataclasses import dataclass


@dataclass
class Document:
    title: str
    content: str

    def word_count(self) -> int:
        return len(self.content.split())


doc = Document("Notes", "the quick brown fox")
print(f"{doc.title}: {doc.word_count()} words")
```

## Rust

```rust
fn main() {
    let headings: Vec<&str> = "# A\n## B\n# C"
        .lines()
        .filter(|l| l.starts_with('#'))
        .collect();

    println!("Found {} headings", headings.len());
}
```

## Shell

```bash
# Build a release bundle
npm install
npm run tauri build
```

## Inline code and keyboard hints

Press `Ctrl+Shift+E` to export. The config lives in `src-tauri/tauri.conf.json`,
and the renderer entry point is `src/lib/markdown.ts`.

## A definition-style table

| Term        | Meaning                                              |
| ----------- | ---------------------------------------------------- |
| Frontmatter | YAML metadata at the top of a file, between `---`    |
| Fenced block| Code wrapped in triple backticks with a language tag |
| Anchor      | The `#slug` link auto-generated for each heading     |

## Footnotes for citations

Markdown was created by John Gruber in 2004.[^md] CommonMark later standardized
much of its behavior.[^cm]

[^md]: Gruber, J. *Markdown*. Daring Fireball, 2004.
[^cm]: MacFarlane, J. et al. *CommonMark Spec*.

---

> When you're happy with a document, export it to clean Markdown or HTML with
> `Ctrl+Shift+E`, or merge several files together with `Ctrl+Shift+C`.
