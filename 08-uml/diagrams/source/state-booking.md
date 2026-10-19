# State — Booking lifecycle (RF-006, RF-007)

Source: `booking-service` `Booking.moveTo`, `Booking.cancel`, `Booking.reschedule`, `BookingStatus`.
Checked on 2026-10-19.

```mermaid
stateDiagram-v2
    direction LR
    [*] --> CONFIRMED : create
    SCHEDULED --> CONFIRMED : confirm
    SCHEDULED --> CANCELLED : cancel
    CONFIRMED --> CONFIRMED : reschedule
    CONFIRMED --> IN_PROGRESS : start
    CONFIRMED --> CANCELLED : cancel
    CONFIRMED --> NO_SHOW : no show
    IN_PROGRESS --> COMPLETED : complete
    COMPLETED --> [*]
    CANCELLED --> [*]
    NO_SHOW --> [*]
```

| Rule | Where |
|---|---|
| `create` confirms the booking at once with a free bay (RF-006) | `Booking.confirmNew` |
| `reschedule` changes time, bay and lines before the start; `cancel` needs a reason (client or admin) | `Booking.reschedule`, `Booking.cancel` |
| `start` and `complete` happen when the operator starts and finishes the service; `no show` when the client did not come | `Booking.moveTo` |
| Only `SCHEDULED` and `CONFIRMED` can be changed or cancelled (RF-007) | `BookingStatus.isChangeable()` |
| `SCHEDULED`, `CONFIRMED`, `IN_PROGRESS` occupy the bay | `BookingStatus.occupiesBay()`, trigger `tr_booking_bay_overlap` |
| Any other move → 409 `INVALID_STATUS_TRANSITION` | `Booking.moveTo` |
| `SCHEDULED` exists in the model (status id 1) but the current flow never creates it | `Booking.confirmNew` |
