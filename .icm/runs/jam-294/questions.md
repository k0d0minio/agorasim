### Q1. The client did not answer question 6 of the epic. What does a paid tour quote without a car hold on its departure?
- type: single
- options: The whole departure, all drivers and all cars | One driver and one car of any class | Keep the car field, but optional
- default: The whole departure, all drivers and all cars
- answer: _waiting_

### Q2. A departure has a booking already. Can Rita sell a tour quote on that departure?
- type: single
- options: Yes, if one driver and one car are free. The quote takes all that is left | No, the departure must be empty
- default: Yes, if one driver and one car are free. The quote takes all that is left
- answer: _waiting_

### Q3. The default of question 6 says that Rita frees a car by hand when the group is small. The admin has no tool for this today. Does this run build one?
- type: single
- options: No, a later ticket. A paid tour quote closes its departure until it is cancelled | Yes, a button on the quote that gives one car back to the departure
- default: No, a later ticket. A paid tour quote closes its departure until it is cancelled
- answer: _waiting_

### Q4. A tour quote needs a marker that is not the car. Which marker?
- type: single
- options: A new column `quotes.kind`, migration 0044 with a backfill | The column `hold_slot` that each tour quote has already, no migration
- default: A new column `quotes.kind`, migration 0044 with a backfill
- answer: _waiting_

### Q5. A tour quote that has a car today: what does it hold after this change?
- type: single
- options: One car of its class, as today. The admin shows the car, and an edit keeps it | The whole departure, as a new tour quote. The car is ignored
- default: One car of its class, as today. The admin shows the car, and an edit keeps it
- answer: _waiting_
