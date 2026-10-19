# State — Inspection report and its phases (CU30)

Source: `operations-service` `InspectionReport` (`start`, `setPhaseStatus`, `addFinding`,
`removeFinding`, `publish`, `requirePublished`), `InspectionPhaseStatus`. Checked on 2026-10-19.

```mermaid
stateDiagram-v2
    state "Report" as R {
        [*] --> Draft : start (admin, service ≥ 180 min, booking CONFIRMED / IN_PROGRESS / COMPLETED)
        Draft --> Draft : phase status, add / remove finding (booking CONFIRMED or IN_PROGRESS)
        Draft --> Published : publish
        Published --> Published : publish again (keeps published_at) / edits while the booking is editable
        Published --> Shared : share → execution.inspection_shared
        Shared --> Shared : share again (new notice)
    }

    state "Each of the 5 phases" as P {
        [*] --> PENDING
        PENDING --> IN_PROGRESS
        IN_PROGRESS --> DONE
        DONE --> IN_PROGRESS
        IN_PROGRESS --> PENDING
    }
```

| Rule | Where |
|---|---|
| Phases: `RECEPTION`, `EXTERIOR`, `INTERIOR`, `ENGINE`, `DELIVERY`; the admin sets any status | `InspectionReport.setPhaseStatus` |
| Editing needs the booking `CONFIRMED` or `IN_PROGRESS`, else 409 `INSPECTION_NOT_EDITABLE` | `InspectionReport.requireEditable` |
| A finding has up to 5 photos (JPEG or PNG, 2 MB each) | `InspectionReport.addFinding`, `InspectionService` |
| Sharing an unpublished report → 409 `INSPECTION_NOT_PUBLISHED`; a booking without a client account → 400 `BOOKING_WITHOUT_CLIENT` | `requirePublished`, `InspectionService.share` |
| Only a published report is served by `/api/v1/public/inspections/{token}` | `InspectionService.published` |

"Shared" is not stored as a column: it is the moment the event is sent, and it can be repeated.
