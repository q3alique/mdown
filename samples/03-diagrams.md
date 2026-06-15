---
title: Diagrams with Mermaid
author: q3alique
date: 2026-06-15
tags: [mermaid, diagrams, flowchart]
---

# Diagrams with Mermaid

Fence a code block as `mermaid` and MDown renders it as a diagram in the
preview. Here are a few common kinds.

## Flowchart

```mermaid
flowchart TD
    A[Open document] --> B{Has frontmatter?}
    B -- Yes --> C[Parse metadata]
    B -- No --> D[Use defaults]
    C --> E[Render preview]
    D --> E
    E --> F{Export?}
    F -- Markdown --> G[Write .md]
    F -- HTML --> H[Write .html]
    F -- No --> I[Keep editing]
```

## Sequence diagram

```mermaid
sequenceDiagram
    participant U as User
    participant E as Editor
    participant R as Renderer
    U->>E: Type Markdown
    E->>R: Send updated text
    R-->>E: Rendered HTML
    E-->>U: Live preview
    U->>E: Ctrl+S
    E-->>U: File saved
```

## Gantt chart

```mermaid
gantt
    title MDown Release Plan
    dateFormat  YYYY-MM-DD
    section Build
    Finalize features      :done,    f1, 2026-06-01, 2026-06-10
    Write documentation    :active,  f2, 2026-06-11, 4d
    section Release
    Tag v0.1.0             :         r1, 2026-06-15, 1d
    Publish binaries       :         r2, after r1, 2d
```

## Pie chart

```mermaid
pie title Time spent writing
    "Drafting" : 45
    "Editing"  : 30
    "Formatting" : 15
    "Procrastinating" : 10
```

## Class diagram

```mermaid
classDiagram
    class Document {
        +string title
        +string content
        +Date modified
        +save()
        +export(format)
    }
    class Editor {
        +Document doc
        +render()
    }
    Editor --> Document : edits
```
