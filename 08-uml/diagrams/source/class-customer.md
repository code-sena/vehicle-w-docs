# Class diagram — customer-service domain

Source: `lavarapido-customer-service/src/main/java/com/lavarapido/customer/domain` as of 2026-10-20.
Getters, `restore(...)` factories and `equals`/`hashCode` are left out.

```mermaid
classDiagram
    direction LR
    class CustomerAccount {
        <<aggregate root>>
        -long customerId
        -long personId
        -Long userId
        -int loyaltyPoints
        -LocalDate customerSince
        -Instant createdAt
        -List~DomainEvent~ pendingEvents
        +provision(personId, userId, LocalDate, Instant)$ CustomerAccount
        +registerVehicle(plate, type, ...) CustomerVehicle
        +updateVehicle(vehicleId, plate, type, ...)
        +removeVehicle(long vehicleId, Instant)
        +findActiveVehicle(long vehicleId) CustomerVehicle
        +activeVehicles() List~CustomerVehicle~
        +hasActiveVehicleWithPlate(LicensePlate) boolean
        +setLoyaltyPoints(int)
        +pullEvents() List~DomainEvent~
    }
    class CustomerVehicle {
        <<entity>>
        -long customerVehicleId
        -long customerId
        -LicensePlate licensePlate
        -VehicleType vehicleType
        -VehicleText brand
        -VehicleText model
        -VehicleText color
        -Instant createdAt
        -Instant deletedAt
        +register(customerId, plate, type, ...)$ CustomerVehicle
        +update(LicensePlate, VehicleType, VehicleText, VehicleText, VehicleText)
        +remove(Instant)
        +isDeleted() boolean
    }
    class LicensePlate {
        <<value object>>
        String value
        +of(String)$ LicensePlate
        +formatted() String
        +matches(String pattern) boolean
    }
    class VehicleText {
        <<value object>>
        String value
        +brand(String)$ VehicleText
        +model(String)$ VehicleText
        +color(String)$ VehicleText
        +orNull() String
    }
    class VehicleType {
        <<value object>>
        short vehicleTypeId
        VehicleTypeCode code
        String name
        BigDecimal sizeFactor
        short displayOrder
        boolean active
        +isSelectable() boolean
    }
    class VehicleTypeCode {
        <<enumeration>>
        CAR
        SEDAN
        SUV
        PICKUP
        TRUCK
        MOTO
        +isMotorcycle() boolean
    }
    class LicensePlatePolicy {
        <<domain service>>
        +validate(LicensePlate, VehicleTypeCode) LicensePlate
        +patternFor(VehicleTypeCode) String
    }
    class DomainEvent {
        <<interface>>
    }

    CustomerAccount "1" *-- "0..*" CustomerVehicle : vehicles
    CustomerVehicle --> LicensePlate
    CustomerVehicle --> VehicleType
    CustomerVehicle --> "3" VehicleText : brand, model, color
    VehicleType --> VehicleTypeCode
    LicensePlatePolicy ..> LicensePlate : validates the format
    LicensePlatePolicy ..> VehicleTypeCode
    CustomerAccount ..> DomainEvent : CustomerProvisioned, VehicleRegistered, VehicleUpdated, VehicleRemoved, LoyaltyPointsChanged
```

Rules kept by these classes:

- A customer account is created (`provision`) when `security.user.registered` arrives; the handler is
  idempotent (one account per user). If the event was lost, the account is created on the first
  vehicle request, asking security-service for the person (`IdentityDirectory`).
- The same plate cannot be active twice in the whole system: `CustomerVehicleService.requirePlateFree`
  checks it (409 `PLATE_ALREADY_REGISTERED`) and the filtered unique index
  `ux_customer_vehicle_plate_active` backs it; the aggregate also checks its own account
  (`hasActiveVehicleWithPlate`). The plate format depends on the vehicle type (`LicensePlatePolicy`): `ABC123` for cars and trucks, `ABC12D`
  for motorcycles.
- Removing a vehicle is a soft delete (`deletedAt`), so past bookings keep pointing to it.
- The domain events (`CustomerProvisioned`, `VehicleRegistered`, `VehicleUpdated`, `VehicleRemoved`,
  `LoyaltyPointsChanged`) are only written to the log (`LoggingDomainEventPublisher`); customer-service
  publishes nothing to RabbitMQ.
- `loyaltyPoints` is a cached balance; the ledger that owns the points is
  `payment.loyalty_transaction` ([class-payment](./class-payment.md)).
