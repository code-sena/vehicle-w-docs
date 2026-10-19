# Use cases by actor (CU01–CU30)

The same 30 use cases of the Requirements Specification (`lavarapido-docs`, SRS §7, Figures 3a–3d),
with the same numbers. Mermaid has no use case diagram, so actors and use cases are drawn as a
flowchart: rounded boxes are use cases, dotted arrows are `«include»` / `«extend»`. Which backend
input port implements each one: [uc-backend-mapping](./uc-backend-mapping.md). Checked on 2026-10-19.

## Any user (client, operator, admin)

```mermaid
flowchart LR
    U(["Any user"])
    CU01(["CU01 Sign in"])
    CU03(["CU03 Recover password"])
    CU04(["CU04 Change password"])
    CU16(["CU16 View dashboard"])
    CU17(["CU17 Manage notifications"])
    CU18(["CU18 Customize visual theme"])
    CU19(["CU19 Select language"])
    U --- CU01
    U --- CU03
    U --- CU04
    U --- CU16
    U --- CU17
    U --- CU18
    U --- CU19
    classDef actor fill:#08427b,color:#fff,stroke:#052e56
    class U actor
```

## Client

```mermaid
flowchart LR
    C(["Client"])
    S(["System"])
    subgraph CTA["Account and vehicles"]
        CU02(["CU02 Create account"])
        CU26(["CU26 Manage vehicles"])
    end
    subgraph RES["Bookings"]
        CU05(["CU05 Request booking"])
        CU06(["CU06 Confirm booking based on availability"])
        CU07(["CU07 Reschedule or cancel booking"])
    end
    subgraph PAG["Payments and loyalty"]
        CU12(["CU12 Pay for a booking"])
        CU14(["CU14 View payment history"])
        CU25(["CU25 Apply promotion at payment"])
        CU15(["CU15 Rate service"])
    end
    CU30(["CU30 Inspection report"])
    C --- CU02
    C --- CU26
    C --- CU05
    C --- CU07
    C --- CU12
    C --- CU14
    C --- CU15
    C --- CU25
    C -. "views through a link" .- CU30
    S --- CU06
    CU05 -. "«include»" .-> CU06
    CU25 -. "«extend»" .-> CU12
    classDef actor fill:#08427b,color:#fff,stroke:#052e56
    class C,S actor
```

## Operator

```mermaid
flowchart LR
    O(["Operator"])
    CU10(["CU10 View assigned services"])
    CU11(["CU11 Start and finish service"])
    CU22(["CU22 Manage operators and their availability"])
    O --- CU10
    O --- CU11
    O -. "views" .- CU22
    classDef actor fill:#08427b,color:#fff,stroke:#052e56
    class O actor
```

## Administrator and system

```mermaid
flowchart LR
    A(["Administrator"])
    S(["System"])
    subgraph AUTH["Users"]
        CU27(["CU27 Administer users and permissions"])
    end
    subgraph CAT["Catalog, opening hours and bays"]
        CU20(["CU20 Configure opening hours, bays and business data"])
        CU21(["CU21 Manage catalog and prices"])
    end
    subgraph RES["Bookings and operations"]
        CU08(["CU08 Assign operator automatically"])
        CU09(["CU09 Assign or reassign operator"])
        CU22(["CU22 Manage operators and their availability"])
        CU29(["CU29 Manage bookings"])
        CU30(["CU30 Record inspection report"])
    end
    subgraph PAG["Payments and promotions"]
        CU13(["CU13 Review payment"])
        CU28(["CU28 Manage payment accounts"])
        CU24(["CU24 Manage promotions"])
    end
    CU23(["CU23 View reports"])
    A --- CU27
    A --- CU20
    A --- CU21
    A --- CU09
    A --- CU22
    A --- CU29
    A --- CU30
    A --- CU13
    A --- CU28
    A --- CU24
    A --- CU23
    S --- CU08
    classDef actor fill:#08427b,color:#fff,stroke:#052e56
    class A,S actor
```

## Backend processes with no use case in the SRS

They run without a person asking for them, or they are account actions that the SRS groups under
other use cases. They are listed so the diagrams match the code; see the mapping for their ports.

```mermaid
flowchart LR
    S(["System (scheduler / events)"])
    U(["Any user"])
    T(["Team member (deploy script)"])
    P1(["Create the first admin at start-up"])
    P2(["Send booking reminders"])
    P3(["Alert admins of unassigned bookings"])
    P4(["Turn domain events into notifications"])
    P5(["Announce a new app version"])
    P6(["Edit profile, email and address"])
    P7(["Close own account"])
    S --- P1
    S --- P2
    S --- P3
    S --- P4
    T --- P5
    U --- P6
    U --- P7
    classDef actor fill:#08427b,color:#fff,stroke:#052e56
    class S,U,T actor
```
