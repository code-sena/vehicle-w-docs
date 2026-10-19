# Class diagram — security-service domain

Source: `lavarapido-security-service/src/main/java/com/lavarapido/security/domain` (`model`, `service`,
`port`) as of 2026-10-19. Getters, `reconstitute(...)` factories and `equals`/`hashCode` are left out.

```mermaid
classDiagram
    direction LR
    class UserAccount {
        <<aggregate root>>
        -Long id
        -EmailAddress username
        -HashedPassword passwordHash
        -boolean active
        -Instant lastLogin
        -Instant createdAt
        -Set~RoleCode~ roles
        -Instant termsAcceptedAt
        -Instant dataPolicyAcceptedAt
        +registerCustomer(Person, EmailAddress, HashedPassword)$ UserAccount
        +create(Person, EmailAddress, HashedPassword, Set~RoleCode~)$ UserAccount
        +acceptLegalDocuments(Instant)
        +ensureCanAuthenticate()
        +recordSuccessfulLogin(Instant)
        +changeEmail(EmailAddress)
        +changePassword(HashedPassword)
        +activate()
        +deactivate()
        +changeRole(RoleCode)
        +hasRole(RoleCode) boolean
    }
    class Person {
        <<entity>>
        -Long id
        -DocumentNumber documentNumber
        -PersonName name
        -PhoneNumber phone
        -EmailAddress email
        +create(DocumentNumber, PersonName, PhoneNumber, EmailAddress)$ Person
        +rename(PersonName)
        +changeEmail(EmailAddress)
        +changePhone(PhoneNumber)
        +completeContactInfo(PhoneNumber, EmailAddress)
    }
    class UserPreference {
        <<entity>>
        -Long id
        -long userId
        -Theme theme
        -Language language
        -boolean notificationsEnabled
        -boolean emailRemindersEnabled
        -boolean promotionsEnabled
        +defaultsFor(long userId)$ UserPreference
        +changeInterface(Theme, Language)
        +changeNotificationChannels(boolean, boolean, boolean)
    }
    class PasswordResetToken {
        <<entity>>
        -Long id
        -long userId
        -HashedPassword codeHash
        -Instant requestedAt
        -Instant expiresAt
        -Instant usedAt
        -String ipAddress
        +issue(long, HashedPassword, Instant, ...)$ PasswordResetToken
        +isRedeemableAt(Instant) boolean
        +ensureRedeemableAt(Instant)
        +redeem(Instant)
        +invalidate(Instant)
    }
    class LoginLockout {
        <<value object>>
        long userId
        int failedCount
        Instant firstFailedAt
        Instant lockedUntil
        +none(long userId)$ LoginLockout
        +isLocked(Instant) boolean
        +registerFailure(Instant) LoginLockout
    }
    class RolePermissions {
        <<value object>>
        RoleCode role
        List~Short~ permissionIds
    }
    class Permission {
        <<value object>>
        short id
        String code
        String name
        String resource
        String action
    }
    class EmailAddress {
        <<value object>>
        String value
    }
    class HashedPassword {
        <<value object>>
        String value
    }
    class DocumentNumber {
        <<value object>>
        String value
    }
    class PersonName {
        <<value object>>
        String firstName
        String lastName
        +fullName() String
    }
    class PhoneNumber {
        <<value object>>
        String value
    }
    class RoleCode {
        <<enumeration>>
        ADMIN
        OPERATOR
        CLIENT
    }
    class Theme {
        <<enumeration>>
        GREEN_LIGHT
        GREEN_DARK
        PINK
        PINK_DARK
    }
    class Language {
        <<enumeration>>
        ES
        EN
        FR
        PT
    }
    class PasswordPolicy {
        <<domain service>>
    }
    class PasswordRecoveryPolicy {
        <<domain service>>
    }

    UserAccount "1" *-- "1" Person : person
    UserAccount --> EmailAddress : username
    UserAccount --> HashedPassword : passwordHash
    UserAccount --> "1..*" RoleCode : roles
    Person --> DocumentNumber
    Person --> PersonName
    Person --> PhoneNumber
    Person --> EmailAddress
    UserPreference ..> UserAccount : userId
    UserPreference --> Theme
    UserPreference --> Language
    PasswordResetToken ..> UserAccount : userId
    PasswordResetToken --> HashedPassword : codeHash
    LoginLockout ..> UserAccount : userId
    RolePermissions --> RoleCode
    RolePermissions ..> "0..*" Permission : permissionIds
    PasswordPolicy ..> HashedPassword : validates before hashing
    PasswordRecoveryPolicy ..> PasswordResetToken : 6-digit code, 15 min, 5 attempts
```

Rules kept by these classes:

- `UserAccount.ensureCanAuthenticate()` rejects an inactive account; `LoginLockout` locks the account
  after 5 failed attempts in 15 minutes (HTTP 423) and a successful login clears it.
- `UserAccount.registerCustomer(...)` always gives the `CLIENT` role; staff accounts are created with
  `create(...)` by an administrator. An account has one role: `changeRole` replaces it (an admin cannot
  change their own), and an admin account cannot be deactivated until its role is changed.
- `PasswordResetToken` can be redeemed once, before `expiresAt`; asking for a new code invalidates the
  previous one.
- Domain events published: `UserRegistered`, `EmailChanged`, `PasswordChanged`, `AccountDeactivated`.
