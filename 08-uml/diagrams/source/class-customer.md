# Class diagram — customer-service domain

Source: `lavarapido-customer-service/src/main/java/com/lavarapido/customer/domain` as of 2026-10-19.
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
        +provision(long personId, Long userId, LocalDate, Instant)$ CustomerAccount
        +registerVehicle(LicensePlate, VehicleType, VehicleText, VehicleText, VehicleText, Instant) CustomerVehicle
        +updateVehicle(long vehicleId, LicensePlate, VehicleType, ...)
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
        +register(long customerId, LicensePlate, VehicleType, ...)$ CustomerVehicle
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
- The same plate cannot be active twice in one account (`hasActiveVehicleWithPlate`), and the plate
  format depends on the vehicle type (`LicensePlatePolicy`): `ABC123` for cars and trucks, `ABC12D`
  for motorcycles.
- Removing a vehicle is a soft delete (`deletedAt`), so past bookings keep pointing to it.
- `loyaltyPoints` is a cached balance; the ledger that owns the points is
  `payment.loyalty_transaction` ([class-payment](./class-payment.md)).
