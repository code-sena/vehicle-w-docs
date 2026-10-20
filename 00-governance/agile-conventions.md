# Agile Team Conventions

> Defines how the team works through its development cycles. Agree on and sign off
> with the entire team before the first sprint. Update when the team decides to change something.

---

## Sprint structure

The cadence follows the SENA ADSO academic calendar in `plan de actividades/scrum1.1.xlsx`,
not a fixed weekly cycle — each sprint lines up with a delivery milestone reviewed by the
instructor rather than an arbitrary week boundary.

| Field | Value |
|-------|-------|
| Duration | 2 weeks, aligned to each academic review cycle |
| Sprint start | Monday |
| Sprint end | Friday of week 2, the day before the instructor review |
| Current sprint | The planned sprints are closed; in October 2026 the team works on delivery fixes and documentation (see `03-product/roadmap.md`) |
| Estimated capacity | 3 part-time apprentices alongside their academic workload — capacity is reduced accordingly, see `01-context/scope.md`, Constraints |

---

## Ceremonies

### Sprint Planning
- **When:** First day of the sprint
- **Duration:** Maximum 1 hour, scheduled around the team's academic timetable
- **Who:** Brayan Patiño, Juan Camilo Guilombo, Merari Urbano
- **Goal:** Select and commit to sprint user stories, break down into technical tasks
- **Output artifact:** Sprint backlog updated in `plan de actividades/scrum1.1.xlsx`

### Daily Stand-up
- **When:** Async, in the team's WhatsApp/Discord channel — not a synchronous meeting, since the three members have different class schedules
- **Duration:** N/A (async)
- **Format:**
  1. What did I do yesterday?
  2. What will I do today?
  3. Is anything blocking me?
- **Rule:** Technical discussions move to a call, they are not resolved in the async thread

### Sprint Review
- **When:** Last day of the sprint, before the instructor review session
- **Duration:** Maximum 30 min
- **Who:** Team (Product Owner role rotates — see `documentation-rules.md`, Owners per section)
- **Goal:** Show what was built and collect feedback before presenting to the instructor

### Sprint Retrospective
- **When:** Last day of the sprint — after the review
- **Duration:** Maximum 30 min
- **Format:** What went well / what to improve / action commitments
- **Rule:** Each retro produces at least 1 improvement action with an owner and due date

### Backlog Refinement
- **When:** Mid-sprint, whenever the three members can align a call
- **Duration:** Maximum 1 hour
- **Goal:** Detail and estimate user stories for the next sprint
- **Exit criterion:** The user story meets the Definition of Ready

---

## Estimation

### Scale
| Points | Meaning |
|--------|---------|
| 1 | Trivial — done in hours |
| 2 | Small — done in one day |
| 3 | Medium — takes 2–3 days |
| 5 | Large — takes almost a full sprint |
| 8 | Very large — should be split |
| 13 | Epic — MUST be split before the sprint |

**Technique:** Planning Poker over a call — with 3 people, a full poker deck is unnecessary ceremony, but voting independently before discussing still avoids anchoring on the first number said
**Tool:** `plan de actividades/scrum1.1.xlsx`

### Estimation rule
- If there is disagreement of 2+ levels (e.g., someone says 3 and another says 8), discuss before voting again.
- If a story is estimated at 8 or 13, it must be split into smaller sub-tasks.

---

## Backlog tool

**Tool:** `plan de actividades/scrum1.1.xlsx`, tracked alongside GitHub Issues for code-level tasks — the team chose a spreadsheet over Jira/Linear because it is what the ficha's academic delivery format expects, and a paid board tool is not justified for 3 part-time apprentices
**Board URL:** N/A — the spreadsheet lives in the repository, not in an external tool

### Board columns
| Column | Meaning |
|--------|---------|
| Backlog | Pending refinement |
| Ready | Ready to enter the sprint (meets DoR) |
| In Progress | Someone is actively working on it |
| In Review | In Pull Request / code review |
| Done | Meets DoD and is closed |

---

## Team velocity

| Sprint | Story points completed | Notes |
|--------|----------------------|-------|
| Sprint 1 | — | — |
| Sprint 2 | — | — |
| Sprint 3 | — | — |
| Average | — | — |

---

## Related documents

- Definition of Ready → `00-governance/definition-of-ready.md`
- Definition of Done → `00-governance/definition-of-done.md`
- Risk management → `15-project-control/risks.md`
- Technical debt backlog → `15-project-control/technical-backlog.md`
