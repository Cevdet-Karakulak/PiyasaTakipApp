# Account navigation and observed fuel changes

Account/profile and settings use the existing settings screen as a visible sixth
bottom tab, alongside the five existing destinations. The market header keeps only
refresh; timestamps are in a separate wrapping row. Refresh has a 44-point target.

The fuel screen no longer fetches or displays generic RSS headlines. It queries
https://petrolistan.com/api/fuel/changes and attributes every event to Petrolistan,
linking https://petrolistan.com/akaryakit/zam-indirim for history and methodology.
This public JSON source was inspected on 2026-10-23. No key or paid service is
configured. Availability and long-term reuse terms are not guaranteed by this repo.

The provider detects realized changes from multiple brand/province observations.
These are NOT EPDK decisions or advance confirmed announcements. Dates are retained
per product. The median delta is not the change in the currently selected city's
Petrol Ofisi quote; it is not automatically reapplied to today's tank calculator.

Only well-formed nonfuture dates with signed numeric deltas and at least 60%
agreement across at least three observed series are accepted. Events cannot postdate
the provider generation date. Duplicate product/date entries are collapsed.
The source timestamp is displayed, with a stale label after 24 hours. Cached
payloads are revalidated, kept at most seven days, and never relabeled as current.
Fetches coalesce, use a 15-minute TTL and a 10-second timeout. Offline/schema errors
show unknown or historical data, never "no increase" or "stable".

EPDK's public price page supplies actual dealer automation prices and distributor
ceiling/recommendation declarations, not an advance-change JSON service discovered
in this review:
https://www.epdk.gov.tr/Detay/Icerik/3-0-158/akaryak%C4%B1tfiyat

Validation: source schema inspected through web retrieval; direct HTTP from this
execution environment returned 403, so live iOS/Android access to this new source
must still be tested on device. Service tests cover cache, concurrent requests,
offline failure, malformed data, future dates, signed direction, and stale times.
Component tests verify the sixth visible tab, attribution, source navigation and
honest historical/error states. A web rendering check uses controlled data and
stubbed router destinations; it cannot validate native iOS black-screen behavior.
