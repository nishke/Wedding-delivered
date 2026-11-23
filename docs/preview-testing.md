# MVP Preview Testing

This branch is for non-commercial product validation only.

## Test sequence
1. Create an owner account and verify email if confirmation is enabled.
2. Create the Dhande's Millennium Catering workspace.
3. Create a customer and an enquiry.
4. Convert the enquiry into an event with its first function.
5. Add a menu from the dish catalogue and add a custom dish.
6. Create a quotation, verify totals and GST presentation, then print/save the quotation as PDF.
7. Record an advance receipt allocated to the booking and verify approval rules.
8. Add estimated and actual expenses; compare the profitability summary.
9. Add a staff account, assign it to an event, and verify staff can only see assigned operational information.
10. Complete and close an event; verify final guest count, leftovers and wastage notes.
11. Check mobile layout and PWA installation behavior.

## Test data
Use synthetic customer names, phone numbers, event details and payment references. Do not enter real customer financial or personal information during this preview.

## Known validation gaps
- Authenticated owner/staff end-to-end tests are pending.
- Casual workers without app accounts are not yet supported by the roster.
- PWA currently registers a service worker but does not provide full offline operation.
- Quotation PDF is produced through browser print/save, not a generated server-side PDF.
