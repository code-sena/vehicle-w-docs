# Class diagram — operations-service domain (execution and inspection)

Source: `lavarapido-operation-service/src/main/java/com/lavarapido/operations/domain` as of 2026-10-20.
Getters, `restore(...)` factories and the read-only metric records (`OperatorWeekMetrics`,
`TeamSummary`) are left out.

```mermaid
classDiagram
    class OperatorMetricsCalculator {
        <<domain service>>
    }
    class BookingSnapshot {
        <<value object>>
        long id
        String code
        String status
        LocalDate date
        LocalTime startTime
        LocalTime endTime
        Long ownerUserId
        String plate
        BigDecimal total
        +lineIds() List~Long~
        +overlaps(BookingSnapshot) boolean
    }
    class Skill {
        <<value object>>
        String name
        Level level
    }
    direction LR
    class AssignmentPolicy {
        <<domain service>>
        +check(Operator, List~WeeklyAvailability~, List~Absence~, BookingSnapshot, List~BookingSnapshot~)$
        +blockingReason(...)$ String
    }
    class OperatorProfile {
        <<value object>>
        String specialty
        List~Skill~ skills
    }
    class ServiceExecution {
        <<aggregate root>>
        -Long id
        -long bookingServiceId
        -int operatorId
        -ExecutionStatus status
        -Instant startedAt
        -Instant finishedAt
        -Short rating
        -String comment
        -Instant ratedAt
        -boolean commentVisible
        +assign(long bookingServiceId, int operatorId)$ ServiceExecution
        +reassign(int newOperatorId)
        +start(Instant)
        +finish(Instant)
        +rate(int stars, String text, Instant)
    }
    class Operator {
        <<aggregate root>>
        -Integer id
        -long userId
        -LocalDate hiredOn
        -boolean active
        +provision(long userId, LocalDate)$ Operator
        +setActive(boolean)
    }
    class WeeklyAvailability {
        <<value object>>
        short dayOfWeek
        LocalTime startsAt
        LocalTime endsAt
        +covers(LocalTime, LocalTime) boolean
    }
    class StartPolicy {
        <<domain service>>
        +EARLY_START = 15 min$
        +startableAt(BookingSnapshot)$ Instant
        +check(BookingSnapshot, Instant)$
    }
    class Level {
        <<enumeration>>
        CERTIFIED
        EXPERT
        ADVANCED
    }
    class InspectionReport {
        <<aggregate root>>
        -Long id
        -long bookingId
        -String publicToken
        -Map~InspectionPhase, PhaseState~ phases
        -List~InspectionFinding~ findings
        -boolean published
        -Instant publishedAt
        +availableFor(BookingSnapshot)$ boolean
        +editableFor(BookingSnapshot)$ boolean
        +start(BookingSnapshot, publicToken, Instant)$ InspectionReport
        +setPhaseStatus(phase, status, Instant)
        +addFinding(phase, area, severity, note, photos) InspectionFinding
        +removeFinding(long findingId, Instant) InspectionFinding
        +publish(Instant)
        +summary() Summary
        +maskedPlate() String
    }
    class InspectionPhaseStatus {
        <<enumeration>>
        PENDING
        IN_PROGRESS
        DONE
    }
    class InspectionFinding {
        <<entity>>
        Long id
        InspectionPhase phase
        String area
        FindingSeverity severity
        String note
        List~Long~ photoIds
        Instant createdAt
    }
    class AutoAssignmentPolicy {
        <<domain service>>
        +choose(List~Candidate~, Integer preferredOperatorId)$ Optional~Integer~
    }
    class FindingSeverity {
        <<enumeration>>
        INFO
        MINOR
        MAJOR
    }
    class TeamSummaryCalculator {
        <<domain service>>
    }
    class Absence {
        <<value object>>
        Integer id
        Instant startsAt
        Instant endsAt
        String reason
        +overlaps(Instant, Instant) boolean
    }
    class InspectionPhase {
        <<enumeration>>
        RECEPTION
        EXTERIOR
        INTERIOR
        ENGINE
        DELIVERY
    }
    class ExecutionStatus {
        <<enumeration>>
        PENDING
        IN_PROGRESS
        PAUSED
        COMPLETED
        WITH_ISSUE
    }
    AssignmentPolicy ..> Absence
    ServiceExecution --> ExecutionStatus
    InspectionReport ..> BookingSnapshot : bookingId (booking-service)
    TeamSummaryCalculator ..> ServiceExecution
    InspectionReport --> "5" InspectionPhase : phases
    Operator "1" -- "0..*" Absence
    AssignmentPolicy ..> Operator
    ServiceExecution ..> Operator : operatorId
    Skill --> Level
    AssignmentPolicy ..> WeeklyAvailability
    AutoAssignmentPolicy ..> AssignmentPolicy : candidates already pass check
    InspectionReport "1" *-- "0..*" InspectionFinding
    InspectionReport ..> InspectionPhaseStatus
    ServiceExecution ..> BookingSnapshot : bookingServiceId (booking-service)
    Operator "1" -- "0..1" OperatorProfile
    OperatorProfile *-- "0..*" Skill
    StartPolicy ..> BookingSnapshot
    OperatorMetricsCalculator ..> ServiceExecution
    Operator "1" -- "0..*" WeeklyAvailability : shifts
    InspectionFinding --> FindingSeverity
```

Rules kept by these classes:

- `AssignmentPolicy` rejects, in this order, an inactive operator (`OPERATOR_INACTIVE`), one without a
  shift that covers the booking (`OPERATOR_NOT_ON_SHIFT`), an absent one (`OPERATOR_ABSENT`) and one
  with another booking at that time (`OPERATOR_BUSY`); the API answers 409 with that code.
- `AutoAssignmentPolicy` takes the operator the customer chose when they are available; otherwise, the
  available operator with the fewest bookings that day (ties by the lowest id).
- `StartPolicy` lets a service start at most 15 minutes before the scheduled time.
- An absence is registered from today on; one that starts before today is rejected with 400
  `ABSENCE_IN_PAST`.
- A service can be rated once, only when `COMPLETED`, with 1 to 5 stars.
- The inspection report is only for services of at least 180 minutes. It is started and edited while
  the booking is `CONFIRMED` or `IN_PROGRESS` (`requireEditable`); with the booking `COMPLETED` it is
  still shown (`availableFor`), and once published the customer opens it with `publicToken` (plate
  masked).
- Events published: `execution.operator_assigned`, `execution.service_started`,
  `execution.service_completed` (`ExecutionEvent`) and `execution.inspection_shared`
  (`InspectionSharedEvent`).
