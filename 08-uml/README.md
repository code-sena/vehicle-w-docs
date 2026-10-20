# 08 — UML Diagrams

> Visual views of LavaRápido drawn from the code. **An outdated diagram is worse than no
> diagram**: keep only the ones the team updates, and change them in the same PR as the code.

---

## Contents

| File | What it answers |
|------|-----------------|
| [`diagram-index.md`](./diagram-index.md) | Every diagram, what it covers, and which are still missing |
| `diagrams/source/` | Diagram sources (Mermaid in Markdown, rendered by GitHub) |
| `diagrams/exports/` | One PNG per diagram, generated from the sources, for documents and slides outside GitHub |
| `tools/render/` | The exporter: Mermaid + ELK with straight lines, 90° elbows and bridges (see "Tool") |

Current diagrams (42, checked on 2026-10-19): use cases by actor and their mapping to the backend
ports; containers (three views: overview, REST calls and events), booking-service components and
production deployment; class diagrams of the six
services; eleven sequences (sign-up, login and lockout, password recovery, booking, reminder,
assignment, automatic assignment, payment, loyalty and coupons, inspection report, APK update);
five state machines (booking, payment, execution, inspection, user account); three activity
diagrams; and six entity-relationship diagrams generated from the database.

---

## Tool

Mermaid inside Markdown: no installation, renders on GitHub and in VS Code's preview. The source is
always the `.md` file; the images in `diagrams/exports/` are a copy for Word, PDF or slides, drawn by
`tools/render` with the team's drawing rules.

### Drawing rules

| Rule | How it is done |
|---|---|
| Lines are straight; a change of direction is a clean 90° elbow | ELK layout with orthogonal routing; every line is redrawn as straight segments |
| No line crosses another; when a crossing cannot be avoided it gets a small bridge | The tool counts the crossings and draws a half-circle jump on the horizontal line |
| Use cases have the actor figure and the ovals aligned in one column | `uc-*` sources are drawn as real UML use case diagrams: actors outside the system box, ovals inside, grouped by package |
| Activity diagrams start with a black dot and end with a ringed dot | A node written `((Start))` / `((End))` (or `Inicio` / `Fin`) is drawn with the UML symbol |
| Nothing overlaps: boxes, labels and group titles stay clear of the lines | The tool reports any line that crosses a box or a group title; the diagram is fixed before it is committed |
| Many-to-many dependencies (services ↔ ports) are a list, not a web of lines | `%% grid: S+P` in a class diagram puts services in S columns and ports in P columns; the dependencies go in a list under the figure |

- Each image has the name of its source (`state-booking.png`). A source with several diagrams gives
  one image per diagram, numbered in order (`c2-containers-1.png`, `-2`, `-3`).
- When a source changes, export the images again in the same PR:
  `cd 08-uml/tools/render && npm install && npm run build && npm run export`. It needs Node 22 and Edge
  (or `BROWSER=chrome`). The tool prints `REVISAR` for any diagram with a crossing or an overlap.
- The 41 images were exported on 2026-10-20 with Mermaid 11.17.2 and ELK and checked one by one: no
  syntax errors, no curved lines, no overlaps. Three diagrams (class-operations, class-payment and
  erd-security) keep one crossing, drawn with a bridge.

---

## Correlations

| Fed by | Diagram |
|---|---|
| `05-architecture/overview.md` | C4 context and containers |
| `09-microservices/services/*/events.md` | Sequences |
| `02-domain/entities-and-rules.md` | State machines |
| `06-data/models.md` and the database | Entity-relationship diagrams |
| Requirements Specification §7 (`lavarapido-docs`) | Use cases |
| `lavarapido-infra` compose files and `deploy/` | Production deployment |
