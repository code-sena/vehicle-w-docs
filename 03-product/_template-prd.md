# Product Requirements Document Template — Express Car Wash

Use this document when a release, milestone or stakeholder needs a formal product specification. It describes product behavior; architecture, persistence and service boundaries are referenced rather than duplicated.

## 1. Identification

| Field | Value |
|---|---|
| Product / milestone | [Express Car Wash / M#] |
| Owner | [Name] |
| Date / version | [YYYY-MM-DD / v#] |
| Status | [Draft/Approved] |

## 2. Problem and objective

- **Problem:** [Link or concise statement from `problem-framing.md`]
- **Users:** [Customer, Operator, Administrator]
- **Objective:** [Measurable outcome]
- **Evidence status:** [Validated / pending discovery]

## 3. Scope

| In scope | Out of scope |
|---|---|
| [Approved capability from `01-context/scope.md`] | [Excluded capability and reason] |

## 4. User journeys and requirements

| ID | User | Need / behavior | Priority | Acceptance criteria |
|---|---|---|---|---|
| [US-XX] | [Role] | [Behavior] | [P0/P1/P2] | [Reference or concise criteria] |

## 5. Business rules and dependencies

| Rule / dependency | Requirement |
|---|---|
| Booking | [One vehicle, branch, wash service, date and time; validate current domain rule.] |
| Availability | [State the relevant schedule/assignment conflict rule.] |
| Payment | [State the required confirmation and provider behavior.] |
| Authorization | [State which role can perform the action.] |

## 6. Success and release criteria

| Measure | Baseline | Target | Measurement method |
|---|---|---|---|
| [Measure] | [Measured/not yet measured] | [Target] | [Method] |

- [ ] Required stories meet their acceptance criteria.
- [ ] Applicable roles and business rules have been tested.
- [ ] Required user interfaces and contracts are available.
- [ ] References to scope, glossary and domain rules are current.

## 7. Traceability

| Source | Reference |
|---|---|
| Context and scope | `01-context/overview.md`, `01-context/scope.md` |
| Domain language/rules | `01-context/glossary.md`, `02-domain/` |
| Product plan | `03-product/` |
| Formal requirements | `04-requirements/` |
