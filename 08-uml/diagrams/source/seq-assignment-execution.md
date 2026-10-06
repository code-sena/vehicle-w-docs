# Sequence — Operator assignment and execution (RF-009, RF-011, RF-012, RF-012b)

Source: `operations-service` `OperationsService.candidates / assign / start / finish / rate`,
`AssignmentPolicy`, `BookingServiceDirectory` (ADR-014).

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin
    actor O as Operator
    actor C as Client
    participant W as Web (through the gateway)
    participant OP as operations-service
    participant B as booking-service
    participant S as security-service
    participant DB as SQL Server (execution)
    participant MQ as RabbitMQ
    participant N as notification-service

    A->>W: Opens a booking → Operator assignment
    W->>OP: GET /api/v1/admin/assignments/{bookingId}/candidates
    OP->>B: GET /admin/bookings/{id} and /admin/bookings?from=&to= (admin JWT)
    OP->>S: GET /admin/users?role=OPERATOR (admin JWT)
    OP->>DB: shifts, absences, executions of the day
    OP-->>W: every operator + blocking reason (available first)
    A->>W: Chooses an operator
    W->>OP: PUT /api/v1/admin/assignments/{bookingId}
    alt booking SCHEDULED/CONFIRMED and AssignmentPolicy finds no reason
        OP->>DB: one service_execution PENDING per booking line
        OP-->>W: 200 assignment
        OP-)MQ: OperatorAssigned (execution.operator_assigned), after commit
        MQ-)N: notifies operator and client
    else inactive / not on shift / absent / busy
        OP-->>W: 409 OPERATOR_INACTIVE | OPERATOR_NOT_ON_SHIFT | OPERATOR_ABSENT | OPERATOR_BUSY
    end

    O->>W: assigned services → Start Service (booking day only)
    W->>OP: POST /api/v1/operator/services/{bookingId}/start
    OP->>B: PATCH /operator/bookings/{id}/status IN_PROGRESS (operator JWT)
    OP->>DB: lines → IN_PROGRESS, started_at
    OP-)MQ: ServiceStarted (execution.service_started)
    O->>W: Finish Service
    W->>OP: POST /api/v1/operator/services/{bookingId}/finish
    OP->>B: PATCH /operator/bookings/{id}/status COMPLETED
    OP->>DB: lines → COMPLETED, finished_at
    OP-)MQ: ServiceCompleted (execution.service_completed)
    MQ-)N: tells the client the wash is done

    C->>W: History → rates the completed booking
    W->>OP: POST /api/v1/ratings/{bookingId} {rating 1–5, comment}
    OP->>B: GET /bookings/{id} (client JWT: only own bookings)
    OP->>DB: rating on every line (once)
    OP-->>W: 201 rating
```

Errors not drawn: 409 `SERVICE_NOT_TODAY`, `EXECUTION_ALREADY_STARTED`, `ALREADY_RATED`,
`SERVICE_NOT_COMPLETED`; 503 `BOOKING_SERVICE_UNAVAILABLE`. Paths and bodies:
`07-api/contracts/openapi/operations-service.yaml`.
