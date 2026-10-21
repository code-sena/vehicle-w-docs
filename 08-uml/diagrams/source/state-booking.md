# State — Booking lifecycle (RF-006, RF-007)

Source: `booking-service` `Booking.moveTo`, `Booking.cancel`, `Booking.reschedule`, `Booking.expire`,
`Booking.markUnattended`, `BookingStatus`, `ExpiredBookingsJob`; `operations-service` `FollowUpPolicy`,
`FollowUpService`. Checked on 2026-10-21.

```mermaid
stateDiagram-v2
    direction LR
    [*] --> CONFIRMED : create
    SCHEDULED --> CONFIRMED : confirm
    SCHEDULED --> CANCELLED : cancel or expired
    CONFIRMED --> CONFIRMED : reschedule (admin)
    CONFIRMED --> IN_PROGRESS : start
    CONFIRMED --> CANCELLED : cancel
    CONFIRMED --> NO_SHOW : no show, or ended without operator
    IN_PROGRESS --> COMPLETED : complete
    COMPLETED --> [*]
    CANCELLED --> [*]
    NO_SHOW --> [*]
```

| Rule | Where |
|---|---|
| `create` confirms the booking at once with a free bay (RF-006) | `Booking.confirmNew` |
| `reschedule` changes time, bay and lines; the admin does it (CU29). The API also accepts it from the client before the start (`PUT /api/v1/bookings/{id}`), but the web and the app do not offer it | `Booking.reschedule`, `BookingService.reschedule` |
| `cancel` always stores a reason: the client cancels before the start without giving one (`CUSTOMER_REQUEST`); the admin may pick one from `cancellation_reason` (`CUSTOMER_REQUEST` if none is sent) | `Booking.cancel`, `BookingService.cancel` |
| `start` and `complete` happen when the operator starts and finishes the service; `no show` when the client did not come | `Booking.moveTo` |
| Only `SCHEDULED` and `CONFIRMED` can be changed or cancelled (RF-007); the client, only before the start time | `BookingStatus.isChangeable()`, `Booking.changeableByCustomer` |
| `SCHEDULED`, `CONFIRMED`, `IN_PROGRESS` occupy the bay | `BookingStatus.occupiesBay()`, trigger `tr_booking_bay_overlap` |
| `expired`: a `SCHEDULED` booking still open one hour after its end is cancelled by booking-service with the system reason `EXPIRED`, which the admin cannot pick by hand | `ExpiredBookingsJob`, `BookingService.closeExpired`, `Booking.expire` |
| `ended without operator`: a `CONFIRMED` booking that never had an operator and is still open one hour after its end becomes `NO_SHOW` by itself: nobody could have attended it. operations-service decides (it knows the assignments) and booking checks the margin again | `FollowUpService.followUp`, `Booking.markUnattended` (`POST /internal/v1/bookings/{id}/no-show`) |
| A `CONFIRMED` booking **with** an operator is never closed by itself: the operator may have attended and forgotten to press Start. Once its time ends it goes to the admin's **To close** list (also an `IN_PROGRESS` one nobody finished, one hour after its end), and the operator and the admins get a notice. The admin picks **Attended** (`COMPLETED`, through `IN_PROGRESS`) or **No-show** | `FollowUpPolicy`, `POST /api/v1/admin/assignments/{id}/attended`, `PATCH /api/v1/admin/bookings/{id}/status` |
| Any other move → 409 `INVALID_STATUS_TRANSITION` | `Booking.moveTo` |
| `SCHEDULED` exists in the model (status id 1) but the current flow never creates it | `Booking.confirmNew` |
