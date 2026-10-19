# Activity — Booking a wash, from the client's point of view (CU05, CU06, CU07)

Built from the web and app booking screens and `booking-service` (`BookingUseCase.availability /
create / reschedule / cancel`). Sequence with the services: [seq-booking](./seq-booking.md). Checked on
2026-10-19.

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
    par1 & par2 --> wait{Before the start,<br/>does the client change it?}
    wait -- reschedule --> date
    wait -- cancel with a reason --> cancelled[CANCELLED<br/>reminders removed]
    wait -- no --> service[Service day: see activity-operator-day]
    cancelled --> stop((End))
    service --> stop
```
