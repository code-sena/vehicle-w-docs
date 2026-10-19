# Sequence — Book a wash (RF-005, RF-006, RF-010)

Source: `booking-service` `BookingService.availability / create`, `AvailabilityPolicy`,
`CustomerVehicleDirectory`; checked against the code on 2026-10-19.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant W as Web
    participant B as booking-service
    participant CU as customer-service
    participant DB as SQL Server
    participant MQ as RabbitMQ
    participant O as operations-service
    participant N as notification-service
    participant S as security-service

    C->>W: Chooses vehicle, service, date
    W->>B: GET /api/v1/bookings/availability?date=…&vehicleTypeId=…&serviceIds=…
    B->>DB: business hours, exceptions, bays, bookings of the day
    B-->>W: free times (or the reason the day has none)
    C->>W: Confirms a time (optionally an operator)
    W->>B: POST /api/v1/bookings {vehicleId, serviceIds, start, notes, preferredOperatorId?}
    B->>CU: GET /api/v1/vehicles/{id} (client JWT)
    CU-->>B: vehicle + type (ownership checked, INV-BOOK-002)
    B->>DB: sp_getapplock (schedule lock)
    alt a bay is free and the vehicle has no other booking at that time
        B->>DB: INSERT booking CONFIRMED + bay + lines with frozen prices
        B-->>W: 201 booking (code RES-000042)
        B-)MQ: BookingConfirmed (booking.confirmed, with preferredOperatorId), after commit
        MQ-)O: BookingConfirmed → automatic assignment (SEQ-06)
        MQ-)N: BookingConfirmed
        N->>S: GET /internal/v1/users/{id}/contact (X-Internal-Key)
        N->>N: BOOKING_CONFIRMED notification + reminders (24 h, 1 h)
        N-->>C: inbox + push + email
    else the vehicle already has a booking at that time
        B-->>W: 409 VEHICLE_ALREADY_BOOKED
    else no free bay, closed day, outside hours or time passed
        B-->>W: 409 SLOT_UNAVAILABLE {reason: NO_FREE_BAY | CLOSED_DAY | OUTSIDE_HOURS | TIME_PASSED,<br/>alternatives: nearest free times, 5 by default}
    end
```

The availability call's exact parameters are in `07-api/contracts/openapi/booking-service.yaml`. The web and
the app translate `reason` into the message shown to the customer. Operator assignment after the
event: [seq-auto-assignment](./seq-auto-assignment.md).
