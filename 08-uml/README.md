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
always the `.md` file; the images in `diagrams/exports/` are a copy for Word, PDF or slides.

- Each image has the name of its source (`state-booking.png`). A source with several diagrams gives
  one image per diagram, numbered in order (`c2-containers-1.png`, `-2`, `-3`).
- When a source changes, export its image again in the same PR: paste the block into
  https://mermaid.live and download the PNG, or save the block as a `.mmd` file and run
  `npx -p @mermaid-js/mermaid-cli mmdc -i state-booking.mmd -o state-booking.png -s 2 -b white`.
- The 41 images were exported on 2026-10-19 with Mermaid 11.4.1 and checked one by one: no syntax
  errors, no cut titles and no overlapping labels.

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
