# State — Booking lifecycle (RF-006, RF-007)

Source: `booking-service` `Booking.moveTo`, `Booking.cancel`, `BookingStatus`.

```mermaid
stateDiagram-v2
    [*] --> CONFIRMED : create (a free bay is assigned at once, RF-006)
    SCHEDULED --> CONFIRMED : confirm (needs a bay)
    SCHEDULED --> CANCELLED : cancel
    CONFIRMED --> CONFIRMED : reschedule (new time/bay, prices kept)
    CONFIRMED --> IN_PROGRESS : start
    CONFIRMED --> NO_SHOW : client did not come
    CONFIRMED --> CANCELLED : cancel (client or admin, with reason)
    IN_PROGRESS --> COMPLETED : complete
    COMPLETED --> [*]
    CANCELLED --> [*]
    NO_SHOW --> [*]
```

| Rule | Where |
|---|---|
| Only `SCHEDULED` and `CONFIRMED` can be changed or cancelled (RF-007) | `BookingStatus.isChangeable()` |
| `SCHEDULED`, `CONFIRMED`, `IN_PROGRESS` occupy the bay | `BookingStatus.occupiesBay()`, trigger `tr_booking_bay_overlap` |
| `SCHEDULED` exists in the model (status id 1) but the current flow never creates it | `Booking.confirmNew` |
