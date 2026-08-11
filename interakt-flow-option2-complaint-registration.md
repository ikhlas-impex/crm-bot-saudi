# Interakt flow — Option 2: Customer Complaint Registration

Picks up after the customer has already sent `REG` and selected option 2 from
the main menu.

1. Bot displays the eligible product groups (Washing Machine, Air Conditioner,
   Refrigerator, TV, Dishwasher, Chest Freezer, Chillers, Big Coolers) →
   save reply as: `productgroup`

2. Bot displays the model list for the selected `productgroup` → save reply
   as: `model`
   (Not built yet — see "still to build" below.)

3. Call `impex-model-eligibility` (body: `{category: productgroup, model}`)
   → save: `eligible` (**Workflow Variable**)
   (Not built yet — see "still to build" below.)

4. Condition: `eligible == false`
   → Bot: "This model is currently not eligible for home-service
   registration. Please give the complaint product to nearest service
   center." → end flow.
   `eligible == true` → continue to step 5.

5. Ask customer name → save as: `customername`
6. Capture WhatsApp number automatically (Interakt system variable) → save
   as: `phone`
7. Ask alternate mobile number → save as: `altmobile`
8. Ask complete address → save as: `address`
9. Ask city → save as: `city`
10. Ask area/location → save as: `area`
11. Ask for a photo of the model/serial number → save as: `modelserialimg`
12. Ask for a product photo → save as: `productimg`
13. Ask for complaint details → save as: `complaintdetails`
14. Ask DOP, format DD/MM/YYYY → save as: `dop`

15. Call `impex-warranty-check` (body: `{category: productgroup, dop}`)
    → save: `warrantystatus`, `chargeamount` (**Workflow Variables**)

16. Condition: `warrantystatus == "IW"`
    → Bot: "Your product is identified as In Warranty. Please upload a
    clear copy of your purchase invoice for warranty verification."
    → customer uploads invoice → save as: `invoiceimg`
    → Call `impex-complaint-register` (body: full payload above +
    `warrantystatus:"IW"`) → save: `uid`, `status`
    → Bot: "Thank you for registering your service request with us. Your
    complaint has been successfully registered. Service UID: {{uid}}.
    Please keep this UID safely for future reference. Our service team will
    verify your request and contact you regarding the service visit." →
    close chat. **End.**

    `warrantystatus == "OW"` → continue to step 17.

17. Bot: "Your product is currently Out of Warranty. An inspection/service
    charge of SAR {{chargeamount}} will be applicable. Would you like to
    proceed? 1️⃣ Yes  2️⃣ No" → save reply as: `owdecision1`

18. Condition: `owdecision1 == "1"` → go to step 21.
    `owdecision1 == "2"` → continue to step 19.

19. Bot (one controlled retry — do not close immediately): "We understand
    your concern. Since this is an Out-of-Warranty service request, an
    inspection charge is applicable. Our technician will inspect the
    product and advise you regarding the required service/repair. Would
    you like to proceed by paying the applicable inspection charge? 1️⃣
    Yes  2️⃣ No — Cancel Service Request" → save reply as: `owdecision2`

20. Condition: `owdecision2 == "1"` → go to step 21.
    `owdecision2 == "2"` → Call `impex-complaint-register` (body: full
    payload + `warrantystatus:"OW"`, `decision:"cancelled"`) → Bot: "Your
    request has been cancelled as you have chosen not to proceed with the
    applicable Out-of-Warranty inspection charge. You may contact us again
    if you wish to proceed with the service." → close chat. **End.**
    (No UID is generated — the enquiry is still recorded in `Complaints`
    with status `OW_CANCELLED` for management visibility.)

21. Bot: "Please transfer SAR {{chargeamount}} to: [bank name / IBAN /
    account number] and upload a screenshot of your payment confirmation."
    → customer uploads image → save as: `paymentproofimg`

22. Call `impex-complaint-register` (body: full payload + `warrantystatus:
    "OW"`, `decision:"accepted"`, `chargeamount`, `paymentproofimg`) →
    save: `uid`, `status`

23. Bot: "Thank you! We've received your payment confirmation and it's
    under review. You'll receive your Service ID by WhatsApp shortly once
    verified." → close chat. **End.**
    (`uid` is not shown here — it's sent by `impex-complaint-confirm` once
    staff approve the payment via `impex-payment-verify`.)

## Notes

- Every webhook response should be captured as a named **Workflow
  Variable**, never a positional `{{n}}` token — the same lesson already
  learned on the dealer registration flow.
- For steps 4, 16, 18, 20: double-check the condition builder is reading
  from **Workflow Variable**, not **User Trait** — this has been the single
  biggest source of bugs on this project so far.
- Media steps (11, 12, 16-invoice, 21-payment-proof): confirm whether
  Interakt hands back a directly fetchable media URL in the webhook
  payload, or a media ID that needs a separate Interakt API call to
  retrieve. `impex-complaint-register` currently expects a stored link
  string in each `*img` field — if Interakt only gives a media ID, add a
  "download from Interakt → upload to Drive → get link" step before
  calling `impex-complaint-register`, the same way `impex-location-parse`
  resolves the Arabic name before writing the row.

## Still to build

- `impex-model-eligibility` — category + model → eligible true/false,
  from a hardcoded list built off the Home Service Model List sheet.
- `impex-payment-verify` — the admin-dashboard Approve/Reject action for
  the payment-proof queue. Step 23 above depends on this to ever resolve;
  without it, an OW customer who pays never gets their UID.
- The admin dashboard's Complaints tab (payment-verification queue +
  general list/status editing).
- The `complaint_registration_confirmation` WhatsApp template needs to be
  submitted and approved in Interakt before `impex-complaint-confirm` can
  actually send anything — it isn't one of your three existing approved
  templates.
