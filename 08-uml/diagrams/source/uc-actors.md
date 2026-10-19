# Use cases by actor (CU01–CU32)

The same 32 use cases of the Requirements Specification (`lavarapido-docs`, SRS §7, Figures 3a–3d),
with the same numbers (CU31 and CU32 were added on 2026-10-19). Mermaid has no use case diagram, so actors and use cases are drawn as a
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
    CU31(["CU31 Manage own account"])
    U --- CU01
    U --- CU03
    U --- CU04
    U --- CU16
    U --- CU17
    U --- CU18
    U --- CU19
    U --- CU31
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
    CU32(["CU32 Run automatic processes"])
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
    S --- CU32
    classDef actor fill:#08427b,color:#fff,stroke:#052e56
    class A,S actor
```

## What CU31 and CU32 group

CU31 is the user's own account (profile, address, email, sign out, close the account). CU32 groups
what runs without a person asking for it; the APK notice is started by a team member's script.

```mermaid
flowchart LR
    S(["System (scheduler / events)"])
    T(["Team member (deploy script)"])
    CU32(["CU32 Run automatic processes"])
    P1(["Create the first admin at start-up"])
    P2(["Send booking reminders"])
    P3(["Alert admins of unassigned bookings"])
    P4(["Turn domain events into notifications"])
    P5(["Announce a new app version"])
    S --- CU32
    T --- P5
    CU32 -. "«include»" .-> P1
    CU32 -. "«include»" .-> P2
    CU32 -. "«include»" .-> P3
    CU32 -. "«include»" .-> P4
    CU32 -. "«include»" .-> P5
    classDef actor fill:#08427b,color:#fff,stroke:#052e56
    class S,T actor
```
