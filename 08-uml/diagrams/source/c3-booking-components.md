# C4 Level 3 — booking-service components (hexagonal)

Source: `lavarapido-booking-service/src/main/java/com/lavarapido/booking` as of 2026-10-19. The other
Java services follow the same layout (`domain` → `application` → `infrastructure`); booking is drawn
because it has every kind of adapter. ADR-002, ADR-009.

```mermaid
flowchart LR
    subgraph IN["infrastructure/adapter/in/web (driving adapters)"]
        BC[BookingController<br/>/api/v1/bookings]
        ABC[AdminBookingController<br/>/api/v1/admin/bookings]
        OBC[OperatorBookingController<br/>/api/v1/operator/bookings]
        IBC[InternalBookingController<br/>/internal/v1/bookings]
        CC[CatalogController]
        SC[ScheduleController]
        EH[ApiExceptionHandler<br/>code + HTTP status]
    end

    subgraph PIN["domain/port/in"]
        BU{{BookingUseCase}}
        CU{{CatalogUseCase}}
        SU{{ScheduleUseCase}}
    end

    subgraph APP["application/usecase"]
        BS[BookingService]
        CS[CatalogService]
        SS[ScheduleService]
    end

    subgraph DOM["domain/model + domain/service"]
        B[Booking · BookingLine · BookingStatus]
        CAT[CatalogItem · ServicePrice]
        SCH[BusinessHour · HoursException · ServiceBay]
        AP[AvailabilityPolicy]
    end

    subgraph POUT["domain/port/out"]
        BR{{BookingRepository}}
        BAR{{BayRepository}}
        CR{{CatalogRepository}}
        SR{{ScheduleRepository}}
        CD{{CustomerDirectory}}
        EP{{DomainEventPublisher}}
    end

    subgraph OUT["infrastructure/adapter/out (driven adapters)"]
        BPA[BookingPersistenceAdapter<br/>JPA + sp_getapplock]
        BAPA[BayPersistenceAdapter]
        CPA[CatalogPersistenceAdapter]
        SPA[SchedulePersistenceAdapter]
        CSD[CustomerServiceDirectory<br/>REST to customer-service]
        RP[RabbitDomainEventPublisher<br/>or LoggingDomainEventPublisher]
    end

    db[(SQL Server<br/>schemas booking, catalog)]
    customer[customer-service]
    mq[[RabbitMQ carwash.events]]

    BC & ABC & OBC & IBC --> BU
    CC --> CU
    SC --> SU
    BU -.implements.- BS
    CU -.implements.- CS
    SU -.implements.- SS
    BS --> B & AP
    CS --> CAT
    SS --> SCH
    BS --> BR & BAR & CR & SR & CD & EP
    CS --> CR
    SS --> SR & BAR
    BR -.implements.- BPA
    BAR -.implements.- BAPA
    CR -.implements.- CPA
    SR -.implements.- SPA
    CD -.implements.- CSD
    EP -.implements.- RP
    BPA & BAPA & CPA & SPA --> db
    CSD --> customer
    RP --> mq
```

| Rule of the layout | How it shows in the code |
|---|---|
| The domain depends on nothing | `domain/model` and `domain/service` import no Spring or JPA class |
| Use cases only see ports | `BookingService` receives `BookingRepository`, `CustomerDirectory`… by constructor |
| Adapters are interchangeable | `RabbitDomainEventPublisher` runs with `app.messaging.enabled=true`; otherwise `LoggingDomainEventPublisher` |
| Tests replace the adapters | `BookingServiceTest` uses Mockito mocks of the out ports; `BookingApiWebTest` tests the controllers alone |
