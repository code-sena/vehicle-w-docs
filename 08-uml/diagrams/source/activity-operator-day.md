# Activity — An operator's working day (CU10, CU11, CU22)

Built from `operations-service` (`OperationsUseCase.myServices / start / finish`, `StartPolicy`,
`AssignmentPolicy`) and the operator screens of the app and web. Checked on 2026-10-19.

```mermaid
flowchart TD
    start((Start of the shift)) --> login[Sign in as OPERATOR]
    login --> list[My services: today's bookings assigned to me<br/>client's first name, vehicle, plate, services]
    list --> any{Any service left today?}
    any -- no --> stats[Check my ratings and week metrics] --> stop((End of the shift))
    any -- yes --> next[Take the next booking]
    next --> early{15 min or less<br/>before the booked time?}
    early -- no --> waitm[Start button disabled<br/>409 SERVICE_TOO_EARLY if forced] --> early
    early -- yes --> startS[Start service<br/>lines IN_PROGRESS, booking IN_PROGRESS]
    startS --> n1[Client notified · reminders removed]
    n1 --> wash[Do the wash]
    wash --> finish[Finish service<br/>lines COMPLETED, booking COMPLETED]
    finish --> n2[Client notified · can pay and rate]
    n2 --> any

    subgraph admin["Done by the admin, not the operator"]
        shifts[Weekly shifts and absences<br/>absence from today on]
        assign[Manual assignment or reassignment<br/>while the service has not started]
        insp[Inspection report for long services]
    end
    shifts -. "decide who can be assigned" .-> list
    assign -.-> list
```
