# 02 — Problem Domain

This section defines the business domain of the Vehicle Washing project. It describes the concepts, bounded contexts, relationships, business rules and domain events that explain how the car-wash operation works.

The documents in this folder are intentionally focused on the business model. Technical implementation details such as microservice deployment, SQL Server structure, API contracts and infrastructure belong in the corresponding project sections.

## Files

| File | Purpose |
|---|---|
| `domain-map.md` | Defines the bounded contexts, their responsibilities and the main relationships between them. |
| `entities-and-rules.md` | Defines the main entities, value objects, aggregates and business rules. |
| `domain-events.md` | Defines the main facts that occur in the business domain and their meaning. |

## Domain boundary

The current MVP represents a **single physical wash shop**. The domain does not model branches, zones or multiple establishments.

The main roles are:

- Customer
- Operator
- Administrator

The main business areas are:

```text
Customer
   │
   ├── vehicle and service selection
   ├── booking and availability
   └── payment / feedback
             │
             ▼
        Booking & Operations
             │
             ├── operator assignment
             ├── service execution
             └── optional rating per service line

Payment, Promotions & Loyalty, and Notification support the flow through
business rules and events.
```

A booking can contain **one or more wash-service lines** for the customer's vehicle and the selected time slot. Each line can have its own service execution and optional rating after completion.

## Important domain decisions

- Booking is the central business process.
- A booking can contain one or more selected wash services.
- A selected service is represented by a booking line with its applicable price and quantity.
- Operator assignment requires availability. The exact automatic-selection or tie-break rule is not defined in this folder when the current requirements contain conflicting wording.
- A service execution belongs to one booking service line and has its own operational lifecycle.
- Customer rating is optional and is given per completed service line.
- Rating is not a separate physical entity in the current data model; it is represented by fields on service execution.
- Loyalty decisions use the loyalty transaction ledger as the source of truth. The customer loyalty balance is only a display copy.
- The establishment is part of the booking context because the MVP has one shop.
- Payment uses manual methods and receipt verification; there is no external card payment gateway in the current scope.

## Relationship with other folders

- `01-context` defines the project context, scope and vocabulary.
- `03-product` defines product priorities and user stories.
- `04-requirements` defines the functional and non-functional requirements.
- `05-architecture` defines how the domain boundaries are implemented as services and how those services communicate.
- `06-data` defines the SQL Server schemas, tables, constraints and migrations.

If a later document changes a business rule or domain concept, this folder must be reviewed so that the same change is reflected consistently in the rest of the documentation.
