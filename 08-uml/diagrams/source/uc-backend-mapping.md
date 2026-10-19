# Use cases → backend input ports

The SRS use cases (CU01–CU30) describe what an actor wants to do. In the code each service exposes
that behavior as **input ports** of the hexagonal architecture (`domain/port/in` in Java,
`Application/Ports/In` in .NET), implemented by an application service and called by a REST controller
or an event listener. One use case can use several ports and services. Checked against the code on
2026-10-19; actors and diagrams: [uc-actors](./uc-actors.md).

## SRS use cases

| CU | Name | Service | Input port → methods |
|---|---|---|---|
| CU01 | Sign in | security | `AuthenticateUserUseCase.login` (with lockout), `LogoutUseCase.logout` |
| CU02 | Create account | security, customer | `RegisterUserUseCase.register` → event → `ConsumeUserRegisteredUseCase.handle` |
| CU03 | Recover password | security | `RequestPasswordResetUseCase`, `VerifyPasswordResetCodeUseCase`, `ResetPasswordUseCase` |
| CU04 | Change password | security | `ChangePasswordUseCase` |
| CU05 | Request booking | booking | `BookingUseCase.availability`, `BookingUseCase.create` |
| CU06 | Confirm booking based on availability | booking | `BookingUseCase.create` (`AvailabilityPolicy`, free bay, 409 with reason and alternatives) |
| CU07 | Reschedule or cancel booking | booking | `BookingUseCase.reschedule`, `BookingUseCase.cancel`, `cancellationReasons` |
| CU08 | Assign operator automatically | operations | `OperationsUseCase.autoAssign` (on `booking.confirmed`), `availableOperators` |
| CU09 | Assign or reassign operator | operations | `OperationsUseCase.candidates`, `assign`, `assignments` |
| CU10 | View assigned services | operations, booking | `OperationsUseCase.myServices`; `BookingUseCase.operatorDay` |
| CU11 | Start and finish service | operations, booking | `OperationsUseCase.start`, `finish` → `BookingUseCase.operatorAdvance` |
| CU12 | Pay for a booking | payment | `IPaymentAccountUseCases.ListForCustomersAsync`, `IPaymentCommandUseCases.ReportAsync` |
| CU13 | Review payment | payment | `IPaymentCommandUseCases.ApproveAsync`, `RejectAsync`, `RefundAsync`, `RegisterInPersonAsync`; `IPaymentQueryUseCases.ListAsync`, `GetAsync`, `AmountDueAsync` |
| CU14 | View payment history | payment | `IPaymentQueryUseCases.MineAsync`, `GetMineAsync`, `MyBookingsAsync` |
| CU15 | Rate service | operations | `OperationsUseCase.rate`, `myGivenRatings`; operator side `myRatings` |
| CU16 | View dashboard | booking, operations, payment | `BookingUseCase.daySummary`, `mine`; `OperationsUseCase.metrics`, `teamSummary`; `ILoyaltyUseCases.BalanceAsync` |
| CU17 | Manage notifications | notification | `NotificationInboxUseCase` (list, unread, read/unread, delete), `DeviceRegistrationUseCase`, `SendNotificationUseCase` (admin message) |
| CU18 | Customize visual theme | security | `GetUserPreferencesUseCase`, `UpdateUserPreferencesUseCase` |
| CU19 | Select language | security | `GetUserPreferencesUseCase`, `UpdateUserPreferencesUseCase` |
| CU20 | Configure opening hours, bays and business data | booking | `ScheduleUseCase` (hours, exceptions, bays, establishment, history) |
| CU21 | Manage catalog and prices | booking | `CatalogUseCase` (categories, services, create, update, setActive, delete) |
| CU22 | Manage operators and their availability | operations | `OperationsUseCase.operators`, `setActive`, `setAvailability`, `absences`, `addAbsence`, `removeAbsence`; `OperatorProfileUseCase` |
| CU23 | View reports | web, payment | No report port: the web builds the reports from the lists above; `IPromotionAdminUseCases.MetricsAsync` gives the coupon figures (partial, as in the SRS) |
| CU24 | Manage promotions | payment | `IPromotionAdminUseCases` (list, metrics, create, update, setActive, delete) |
| CU25 | Apply promotion at payment | payment | `ICustomerPromotionUseCases.ListAvailableAsync`, `RedeemAsync`; `ILoyaltyUseCases.BalanceAsync` |
| CU26 | Manage vehicles | customer | `ListCustomerVehiclesUseCase`, `GetCustomerVehicleUseCase`, `RegisterCustomerVehicleUseCase`, `UpdateCustomerVehicleUseCase`, `RemoveCustomerVehicleUseCase`, `ListVehicleTypesUseCase` |
| CU27 | Administer users and permissions | security | `ListUserAccountsUseCase`, `CreateUserAccountUseCase`, `ChangeAccountStatusUseCase`, `ChangeAccountRoleUseCase`, `ListRolePermissionsUseCase`, `UpdateRolePermissionsUseCase` |
| CU28 | Manage payment accounts | payment | `IPaymentAccountUseCases.ListAllAsync`, `ListMethodsAsync`, `CreateAsync`, `UpdateAsync` |
| CU29 | Manage bookings | booking, customer | `BookingUseCase.list`, `get`, `create` (for a client), `reschedule`, `changeStatus`; `LookupVehiclesUseCase` |
| CU30 | Record inspection report | operations | `InspectionUseCase` (forBooking, start, setPhaseStatus, addFinding, removeFinding, publish, share; `published` for the client's link) |

## Ports with no use case in the SRS

| Port | Service | What it does | Started by |
|---|---|---|---|
| `GetUserProfileUseCase`, `UpdateUserProfileUseCase`, `ChangeEmailUseCase`, `PersonAddressUseCase` | security | Own profile, email and address (RF-027) | Any user |
| `DeactivateOwnAccountUseCase` | security | Close own account with the password (not admins) | Client, operator |
| `BootstrapAdministratorUseCase` | security | Creates the first admin from environment variables when there is none | Start-up |
| `BookingReminderUseCase` | notification | Plans, cancels and sends reminders | Events + scheduler |
| `UnassignedBookingAlertUseCase` | notification | Warns the admins of a booking without an operator 2 h before | Scheduler |
| `ConsumeDomainEventUseCase` | notification | Turns each event of `carwash.events` into notifications | RabbitMQ |
| `AppUpdateNoticeUseCase` | notification | Announces a new APK once | `deploy/publish-apk.sh` |
| `BookingUseCase.getForService`, `listForService` | booking | Booking data for other services (`/internal/v1/bookings`) | operations-service |

Adding these to the SRS is optional: the profile and closing the account fit as a new use case
("Manage own account"), and the scheduled processes as System use cases.
