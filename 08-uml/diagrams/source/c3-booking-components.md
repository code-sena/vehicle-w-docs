# C4 Level 3 — booking-service components (hexagonal)

Source: `lavarapido-booking-service/src/main/java/com/lavarapido/booking` as of 2026-10-19 (payment at booking added on 2026-10-26). The other
Java services follow the same layout (`domain` → `application` → `infrastructure`); booking is drawn
because it has every kind of adapter. ADR-002, ADR-009.

```mermaid
flowchart LR
    subgraph IN["Adapters in (web, messaging, scheduling)"]
        BC[BookingController<br/>/api/v1/bookings]
        ABC[AdminBookingController<br/>/api/v1/admin/bookings]
        OBC[OperatorBookingController<br/>/api/v1/operator/bookings<br/>JWT + X-Internal-Key]
        IBC[InternalBookingController<br/>/internal/v1/bookings]
        CC[CatalogController]
        SC[ScheduleController]
        EH[ApiExceptionHandler<br/>code + HTTP status]
        PEL[PaymentEventsListener<br/>payment.reported, payment.confirmed]
        PDJ[PaymentDeadlineJob<br/>every 60 s]
    end

    subgraph PIN["Ports in"]
        BU{{BookingUseCase}}
        CU{{CatalogUseCase}}
        SU{{ScheduleUseCase}}
    end

    subgraph APP["Use cases"]
        BS[BookingService]
        CS[CatalogService]
        SS[ScheduleService]
    end

    subgraph DOM["Domain"]
        B[Booking · BookingLine · BookingStatus]
        CAT[CatalogItem · ServicePrice]
        SCH[BusinessHour · HoursException · ServiceBay]
        AP[AvailabilityPolicy]
        PP[PaymentPolicy · PaymentMode]
    end

    subgraph POUT["Ports out"]
        BR{{BookingRepository}}
        BAR{{BayRepository}}
        CR{{CatalogRepository}}
        SR{{ScheduleRepository}}
        CD{{CustomerDirectory}}
        EP{{DomainEventPublisher}}
        PSD{{PaymentStatusDirectory}}
    end

    subgraph OUT["Adapters out"]
        BPA[BookingPersistenceAdapter<br/>JPA + sp_getapplock]
        BAPA[BayPersistenceAdapter]
        CPA[CatalogPersistenceAdapter]
        SPA[SchedulePersistenceAdapter]
        CSD[CustomerServiceDirectory<br/>REST to customer-service]
        RP[RabbitDomainEventPublisher<br/>or LoggingDomainEventPublisher]
        PSA[PaymentServiceDirectory<br/>REST to payment-service, X-Internal-Key]
    end

    db[(SQL Server<br/>schemas booking, catalog)]
    customer[customer-service]
    payment[payment-service]
    mq[[RabbitMQ carwash.events]]
    mqin[[RabbitMQ<br/>queue booking.payment-events]]

    BC & ABC & OBC & IBC & PEL & PDJ --> BU
    CC --> CU
    SC --> SU
    BU -.implements.- BS
    CU -.implements.- CS
    SU -.implements.- SS
    APP -- "use" --> DOM
    APP -- "call" --> POUT
    BR -.implements.- BPA
    BAR -.implements.- BAPA
    CR -.implements.- CPA
    SR -.implements.- SPA
    CD -.implements.- CSD
    EP -.implements.- RP
    PSD -.implements.- PSA
    BPA & BAPA & CPA & SPA --> db
    CSD --> customer
    RP --> mq
    mqin --> PEL
    PSA --> payment
```

What each use case uses (the two arrows above, in detail):

| Use case | Domain | Ports out |
|---|---|---|
| `BookingService` | `Booking`, `BookingLine`, `BookingStatus`, `AvailabilityPolicy`, `PaymentPolicy`, `PaymentMode` | `BookingRepository`, `BayRepository`, `CatalogRepository`, `ScheduleRepository`, `CustomerDirectory`, `DomainEventPublisher`, `PaymentStatusDirectory` |
| `CatalogService` | `CatalogItem`, `ServicePrice` | `CatalogRepository` |
| `ScheduleService` | `BusinessHour`, `HoursException`, `ServiceBay` | `ScheduleRepository`, `BayRepository` |

Folders: adapters in = `infrastructure/adapter/in/web` (plus `in/messaging` and `in/scheduling`), ports in = `domain/port/in`, use cases =
`application/usecase`, domain = `domain/model` and `domain/service`, ports out = `domain/port/out`,
adapters out = `infrastructure/adapter/out`.

| Rule of the layout | How it shows in the code |
|---|---|
| The domain depends on nothing | `domain/model` and `domain/service` import no Spring or JPA class |
| Use cases only see ports | `BookingService` receives `BookingRepository`, `CustomerDirectory`… by constructor |
| Adapters are interchangeable | `RabbitDomainEventPublisher` runs with `app.messaging.enabled=true`; otherwise `LoggingDomainEventPublisher` |
| Tests replace the adapters | `BookingServiceTest` uses Mockito mocks of the out ports; `BookingApiWebTest` tests the controllers alone |
