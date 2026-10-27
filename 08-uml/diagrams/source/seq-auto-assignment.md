# Sequence — Automatic operator assignment (RF-008, RF-010)

Source: `booking-service` `BookingService.create`, `operations-service` `BookingConfirmedListener`,
`OperationsService.autoAssign / availableOperators`, `AutoAssignmentPolicy`, `AssignmentPolicy` (ADR-014).

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant W as Web or mobile (through the gateway)
    participant B as booking-service
    participant OP as operations-service
    participant S as security-service
    participant DB as SQL Server (execution)
    participant MQ as RabbitMQ
    participant N as notification-service

    C->>W: Book wash → chooses vehicle, service, date and time
    W->>OP: GET /api/v1/operators/available?date=&time=&minutes=
    OP->>DB: shifts, absences, executions of the day
    OP-->>W: free operators (the list may be empty)
    C->>W: Optional: chooses an operator (or "no preference")
    W->>B: POST /api/v1/bookings {..., preferredOperatorId?}
    B-->>W: 201 booking CONFIRMED with its bay
    B-)MQ: BookingConfirmed (booking.confirmed) with preferredOperatorId, after commit
    MQ-)N: booking confirmation to the client
    MQ-)OP: BookingConfirmed (queue operations-service.booking-confirmed, 3 attempts, then its DLQ)
    OP->>B: GET /internal/v1/bookings/{id} and /internal/v1/bookings?from=&to= (X-Internal-Key)
    alt booking is no longer assignable
        OP-->>OP: nothing to do
    else reschedule: booking already has executions
        OP-->>OP: keeps the operator if they still fit, else tries another free operator
        opt nobody fits (E-12)
            OP->>DB: delete the PENDING executions
            OP-)MQ: OperatorUnassigned (execution.operator_unassigned)
            MQ-)N: notifies the operator and every active admin
        end
    else
        OP->>DB: shifts, absences, executions of that day
        OP->>S: GET /internal/v1/users/{id}/contact (account still active, fails closed with 503 → retried, A-13)
        OP-->>OP: AutoAssignmentPolicy: chosen operator if free, else fewest bookings that day, then lowest id
        alt somebody is free
            OP->>DB: one service_execution PENDING per booking line (actor: system)
            OP-)MQ: OperatorAssigned (execution.operator_assigned), after commit
            MQ-)N: notifies operator and client
        else nobody is free
            OP-->>OP: booking stays without an operator
            N-->>N: UnassignedBookingAlertService warns every active admin 2 h before the start
        end
    end
```

The admin can still change the operator by hand with `PUT /api/v1/admin/assignments/{bookingId}`
(`seq-assignment-execution.md`). Automatic assignment can be turned off with
`app.auto-assign.enabled=false`. Paths and bodies: `07-api/contracts/openapi/operations-service.yaml`.
