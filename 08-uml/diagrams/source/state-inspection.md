# State — Inspection report and its phases (CU30)

Source: `operations-service` `InspectionReport` (`start`, `setPhaseStatus`, `addFinding`,
`removeFinding`, `publish`, `requirePublished`), `InspectionPhaseStatus`. Checked on 2026-10-20.

```mermaid
stateDiagram-v2
    state "Report" as R {
        [*] --> Draft : start
        Draft --> Draft : edit phases and findings
        Draft --> Published : publish
        Published --> Published : edit or publish again
        Published --> Shared : share → execution.inspection_shared
        Shared --> Shared : share again
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
| The admin starts it only for services of 180 minutes or more with the booking `CONFIRMED` or `IN_PROGRESS`; with the booking `COMPLETED` an existing report can still be read, published and shared | `InspectionReport.start` (`requireEditable`), `availableFor` |
| Publishing again keeps the first `published_at` | `InspectionReport.publish` |
| Phases: `RECEPTION`, `EXTERIOR`, `INTERIOR`, `ENGINE`, `DELIVERY`; the admin sets any status | `InspectionReport.setPhaseStatus` |
| Editing needs the booking `CONFIRMED` or `IN_PROGRESS`, else 409 `INSPECTION_NOT_EDITABLE` | `InspectionReport.requireEditable` |
| A finding has up to 5 photos (JPEG or PNG, 2 MB each) | `InspectionReport.addFinding`, `InspectionService` |
| Sharing an unpublished report → 409 `INSPECTION_NOT_PUBLISHED`; a booking without a client account → 400 `BOOKING_WITHOUT_CLIENT` | `requirePublished`, `InspectionService.share` |
| Only a published report is served by `/api/v1/public/inspections/{token}` | `InspectionService.published` |

"Shared" is not stored as a column: it is the moment the event is sent, and it can be repeated.
