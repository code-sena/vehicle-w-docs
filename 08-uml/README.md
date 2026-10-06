# 08 — UML Diagrams

> Visual views of LavaRápido drawn from the code. **An outdated diagram is worse than no
> diagram**: keep only the ones the team updates, and change them in the same PR as the code.

---

## Contents

| File | What it answers |
|------|-----------------|
| [`diagram-index.md`](./diagram-index.md) | Every diagram, what it covers, and which are still missing |
| `diagrams/source/` | Diagram sources (Mermaid in Markdown, rendered by GitHub) |
| `diagrams/exports/` | Exported images, only when a document outside GitHub needs one |

Current diagrams: containers (C4-02); sign-up, booking, reminder, operator assignment/execution and
payment sequences; booking and payment state machines.

---

## Tool

Mermaid inside Markdown: no installation, renders on GitHub and in VS Code's preview. For an image,
paste the block into https://mermaid.live and export SVG to `diagrams/exports/`.

---

## Correlations

| Fed by | Diagram |
|---|---|
| `05-architecture/overview.md` | C4 context and containers |
| `09-microservices/services/*/events.md` | Sequences |
| `02-domain/entities-and-rules.md` | State machines |
