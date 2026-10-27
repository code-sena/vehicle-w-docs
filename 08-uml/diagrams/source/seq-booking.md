# Sequence — Book a wash (RF-005, RF-006, RF-010)

Source: `booking-service` `BookingService.availability / create / cancelForPaymentTimeout`, `AvailabilityPolicy`,
`PaymentPolicy`, `PaymentDeadlineJob`, `CustomerVehicleDirectory`, `PaymentStatusDirectory`; checked against
the code on 2026-10-19, payment at booking added on 2026-10-27 (ADR-021).

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant W as Web
    participant B as booking-service
    participant CU as customer-service
    participant P as payment-service
    participant DB as SQL Server
    participant MQ as RabbitMQ
    participant O as operations-service
    participant N as notification-service
    participant S as security-service

    C->>W: Chooses vehicle, service, date
    W->>B: GET /api/v1/bookings/availability?date=…&vehicleTypeId=…&serviceIds=…
    B->>DB: business hours, exceptions, bays, bookings of the day
    B-->>W: free times (or the reason the day has none)
    C->>W: Confirms a time (optionally an operator) and the payment mode
    W->>B: POST /api/v1/bookings {vehicleId, serviceIds (1 to 10), date, time, paymentMode, notes, preferredOperatorId?}
    alt paymentMode missing or not DIGITAL / CASH
        B-->>W: 400 INVALID_PAYMENT_MODE
    else valid mode
        B->>CU: GET /api/v1/vehicles/{id} (client JWT)
        CU-->>B: vehicle + type (INV-BOOK-002)
        B->>DB: sp_getapplock (schedule lock)
        alt a bay is free, the vehicle is free and the cash limit allows it
            B->>DB: INSERT booking CONFIRMED + bay + lines with frozen prices,<br/>payment_mode, payment_deadline (DIGITAL: min(now + 30 min, start))
            B-->>W: 201 booking (code RES-000042, paymentMode, paymentDeadline)
            B-)MQ: BookingConfirmed (booking.confirmed, with preferredOperatorId), after commit
            MQ-)O: BookingConfirmed → automatic assignment (SEQ-06)
            MQ-)N: BookingConfirmed
            N->>S: GET /internal/v1/users/{id}/contact (X-Internal-Key)
            N->>N: BOOKING_CONFIRMED notification + reminders (24 h, 1 h)
            N-->>C: inbox + push + email
        else the vehicle already has a booking at that time
            B-->>W: 409 VEHICLE_ALREADY_BOOKED
        else CASH and the client already has an active cash booking
            B-->>W: 409 CASH_BOOKING_LIMIT
        else no free bay, closed day, outside hours or time passed
            B-->>W: 409 SLOT_UNAVAILABLE {reason: NO_FREE_BAY | CLOSED_DAY | OUTSIDE_HOURS | TIME_PASSED,<br/>alternatives: up to 5 free times of that day, without the vehicle's other bookings}
        end
    end

    Note over B,DB: Every 60 s, PaymentDeadlineJob (DIGITAL bookings only)
    B->>DB: DIGITAL bookings past payment_deadline with no payment_reported_at
    B->>P: GET /internal/v1/payments/bookings/{id}/reported (X-Internal-Key)
    alt reported = true
        B->>DB: payment_reported_at = now (the booking is kept)
    else reported = false
        B->>DB: sp_getapplock, UPDATE booking CANCELLED, reason PAYMENT_TIMEOUT
        B-)MQ: BookingCancelled (booking.cancelled, reasonCode PAYMENT_TIMEOUT)
        MQ-)N: BookingCancelled → notice to the client, reminders cancelled
    else no answer or error
        B->>B: not cancelled in this round (PAYMENT_SERVICE_UNAVAILABLE), tried again in the next
    end
```

The availability call's exact parameters are in `07-api/contracts/openapi/booking-service.yaml`. The web and
the app translate `reason` into the message shown to the customer. Operator assignment after the
event: [seq-auto-assignment](./seq-auto-assignment.md). How the reported payment reaches booking
before the deadline (`payment.reported`): [seq-payment](./seq-payment.md). Admin bookings have no payment
deadline and no cash limit; a reschedule keeps the deadline.
