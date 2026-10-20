# Sequence — Vehicle inspection report (RF-030 in the SRS, CU30)

Source: `operations-service` `InspectionControllers` (`/api/v1/admin/inspections/{bookingId}`,
`/api/v1/public/inspections/{token}`), `InspectionService`, `InspectionReport`; web
`admin/reservations/:id/inspection` and the public page `report/:token`; checked against the code on
2026-10-20.

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin
    actor C as Client
    participant W as Web (through the gateway)
    participant OP as operations-service
    participant B as booking-service
    participant DB as SQL Server (execution)
    participant MQ as RabbitMQ
    participant N as notification-service

    A->>W: Booking detail → Inspection
    W->>OP: GET /api/v1/admin/inspections/{bookingId}
    OP->>B: GET /admin/bookings/{id} (admin JWT)
    alt service shorter than 180 min or booking not CONFIRMED / IN_PROGRESS / COMPLETED
        OP-->>W: not available for this booking
    else booking COMPLETED
        OP-->>W: the report already made, read only (it can still be published and shared)
    else booking CONFIRMED or IN_PROGRESS
        W->>OP: POST /api/v1/admin/inspections/{bookingId} (start, returns the one already there)
        OP->>DB: inspection_report + 5 phases PENDING + random public token
    end

    loop each phase: RECEPTION, EXTERIOR, INTERIOR, ENGINE, DELIVERY
        A->>W: Phase status, findings with photos
        W->>OP: PATCH /phases/{phase} {PENDING | IN_PROGRESS | DONE}
        W->>OP: POST /findings (multipart: area, severity INFO | MINOR | MAJOR, note, up to 5 photos)
        OP->>OP: booking still CONFIRMED or IN_PROGRESS, JPEG or PNG up to 2 MB each
        OP->>DB: inspection_finding + inspection_photo (bytes in the database)
    end

    A->>W: Publish
    W->>OP: POST /publish
    OP->>DB: published = true, published_at
    A->>W: Send to the client
    W->>OP: POST /share
    OP-)MQ: execution.inspection_shared {booking, plate, phases done, findings, major findings, token}
    MQ-)N: InspectionShared
    N-->>C: INSPECTION_REPORT (inbox, push, email) with the link WEB_URL/report/{token}

    C->>W: Opens the link (no login)
    W->>OP: GET /api/v1/public/inspections/{token}
    OP-->>W: published report, plate masked
    W->>OP: GET /api/v1/public/inspections/{token}/photos/{photoId}
```

Errors not drawn: 400 `TOO_MANY_PHOTOS`, `INVALID_PHOTO`, `BOOKING_WITHOUT_CLIENT`; an unpublished
report is not served by the public route. States of the report: [state-inspection](./state-inspection.md).
