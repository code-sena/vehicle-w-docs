# State — Booking lifecycle (RF-006, RF-007)

Source: `booking-service` `Booking.moveTo`, `Booking.cancel`, `Booking.reschedule`, `BookingStatus`.
Checked on 2026-10-19.

```mermaid
stateDiagram-v2
    [*] --> CONFIRMED : create (a free bay is assigned at once, RF-006)
    SCHEDULED --> CONFIRMED : confirm (needs a bay)
    SCHEDULED --> CANCELLED : cancel
    CONFIRMED --> CONFIRMED : reschedule (new time, bay and lines, before the start)
    CONFIRMED --> IN_PROGRESS : start (operator starts the service)
    CONFIRMED --> NO_SHOW : client did not come
    CONFIRMED --> CANCELLED : cancel (client or admin, with reason)
    IN_PROGRESS --> COMPLETED : complete (operator finishes the service)
    COMPLETED --> [*]
    CANCELLED --> [*]
    NO_SHOW --> [*]
```

| Rule | Where |
|---|---|
| Only `SCHEDULED` and `CONFIRMED` can be changed or cancelled (RF-007) | `BookingStatus.isChangeable()` |
| `SCHEDULED`, `CONFIRMED`, `IN_PROGRESS` occupy the bay | `BookingStatus.occupiesBay()`, trigger `tr_booking_bay_overlap` |
| Any other move → 409 `INVALID_STATUS_TRANSITION` | `Booking.moveTo` |
| `SCHEDULED` exists in the model (status id 1) but the current flow never creates it | `Booking.confirmNew` |
