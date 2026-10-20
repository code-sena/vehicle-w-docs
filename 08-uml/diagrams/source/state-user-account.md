# State — User account (RF-001, RF-002, RF-004b, RF-027)

Source: `security-service` `UserAccount` (`activate`, `deactivate`, `ensureCanAuthenticate`),
`LoginLockout`, `AuthenticationService`, `UserAdministrationService.changeStatus`,
`AccountDeactivationService.deactivateOwnAccount`,
`PasswordRecoveryService.resetPassword`.
Checked on 2026-10-20.

```mermaid
stateDiagram-v2
    [*] --> Active : sign-up (CLIENT) or created by the admin (OPERATOR / ADMIN)

    state Active {
        [*] --> Unlocked
        Unlocked --> Locked : 5th failed login in 15 min
        Locked --> Unlocked : 15 min pass or password recovered
    }

    Active --> Inactive : admin deactivates it, or the user closes it
    Inactive --> Active : admin activates it
```

| Rule | Where |
|---|---|
| A failed login below 5 in 15 minutes only adds to the count; a successful login clears it | `LoginLockout`, `AuthenticationService.login` |
| The admin cannot deactivate an admin account or their own; the user closes their own account with the password, and an admin cannot close theirs | `UserAdministrationService.changeStatus`, `AccountDeactivationService` |
| While `Locked` even the right password answers 423 `ACCOUNT_LOCKED` | `AuthenticationService.login` |
| An `Inactive` account answers 403 `ACCOUNT_DISABLED`, checked only after the right password | `UserAccount.ensureCanAuthenticate` |
| An inactive account cannot ask for a recovery code (the answer looks the same) | `PasswordRecoveryService.findActiveAccount` |
| An admin cannot deactivate their own account, from the user list or from the profile → 403 `CANNOT_DISABLE_OWN_ACCOUNT` | `CannotDisableOwnAccountException` |
| No admin account can be deactivated → 403 `ADMIN_CANNOT_BE_DISABLED` | `AdminAccountCannotBeDisabledException` |
| Closing one's own account asks for the current password and closes every session | `AccountDeactivationService` |
