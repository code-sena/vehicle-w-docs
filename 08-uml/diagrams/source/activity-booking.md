# Activity — Booking a wash, from the client's point of view (CU05, CU06, CU07)

Built from the web and app booking screens and `booking-service` (`BookingUseCase.availability /
create / reschedule / cancel`). Sequence with the services: [seq-booking](./seq-booking.md). The client
cancels from the history or the payment screen (confirm dialog, no reason asked); neither the web nor the app has a reschedule
screen for the client, so a new date is set by the administrator from Bookings (CU29). Checked on
2026-10-20.

```mermaid
flowchart TD
    start((Start)) --> login{Signed in?}
    login -- no --> signin[Sign in or create account] --> login
    login -- yes --> veh{Has a vehicle?}
    veh -- no --> addveh[Register vehicle<br/>plate format by type] --> veh
    veh -- yes --> pick[Choose vehicle and services]
    pick --> date[Choose a date<br/>past days are blocked]
    date --> avail[System lists the free times<br/>hours, exceptions, bays, other bookings]
    avail --> hasfree{Free times?}
    hasfree -- "no (closed day, outside hours,<br/>no free bay)" --> date
    hasfree -- yes --> time[Choose a time]
    time --> op{Choose an operator?}
    op -- yes --> chooseop[Pick one of the free operators]
    op -- no --> confirm
    chooseop --> confirm[Confirm the summary]
    confirm --> create[System takes the schedule lock<br/>and looks for a free bay]
    create --> ok{Bay free and vehicle<br/>without another booking?}
    ok -- no --> alt[409: reason + nearest times] --> time
    ok -- yes --> done[Booking CONFIRMED with code RES-…<br/>event booking.confirmed]
    done --> par1[Operator assigned automatically]
    done --> par2[Confirmation and reminders 24 h / 1 h]
    par1 & par2 --> wait{Any change<br/>before the start?}
    wait -- "client cancels<br/>(confirm dialog)" --> cancelled[CANCELLED<br/>reminders removed]
    wait -- "admin reschedules<br/>from Bookings" --> resched[New date and time<br/>same checks as above] --> wait
    wait -- no --> service[Service day: see activity-operator-day]
    cancelled --> stop((End))
    service --> stop
```
