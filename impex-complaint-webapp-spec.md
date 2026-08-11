# IMPEX Saudi — Customer Complaint Registration Web App (Spec)

Replaces the in-Interakt conversational collection for Option 2. Interakt's
job shrinks to: greet the customer, offer the menu, and hand off to this web
app with a link. Registration, model eligibility, warranty check, media
upload, and payment-proof collection all happen in the web app instead.

---

## 1. Where this fits

```
Customer texts "REG" on WhatsApp
        ↓
Interakt bot: menu → "File a complaint / warranty check"
        ↓
Bot sends a plain message containing a link (no approved template needed —
you're inside the 24-hour session window since the customer messaged first)
        ↓
Customer taps link → opens the web app in their phone browser
        ↓
Web app: collects details, checks eligibility + warranty, collects
payment proof if needed, writes the row, generates the UID
        ↓
Web app backend fires a WhatsApp confirmation via impex-complaint-confirm
(same n8n workflow built earlier — now called from Vercel, not from n8n)
```

## 2. The Interakt handoff link

Send a plain text message from the bot, not a template:

```
To register your complaint and check your warranty status, please tap the
link below and fill in your details:

https://impex-saudi.vercel.app/complaint?phone={{phone}}
```

`{{phone}}` is Interakt's own system variable for the customer's WhatsApp
number — pass it as a query param so the web form can pre-fill/identify the
customer without asking again.

**Security note (optional, worth doing before this goes live):** passing
the raw phone number means anyone who gets the link can submit under that
number. If that matters to you, have a lightweight endpoint generate a
short-lived random token instead (`?token=...`) that the web app resolves
back to the phone server-side. Flagging it — not building it here, since it
adds a moving part for what's currently a low-fraud-risk warranty form.

## 3. New Google Sheet

A **separate spreadsheet** from the dealer one, dedicated to customer data.

**Spreadsheet:** create new → share with the same service account used for
pickup ticket writes (`GOOGLE_SERVICE_ACCOUNT_EMAIL` in your existing Vercel
env) so the web app can read/write without new credentials.

### Tab: `Complaints`
```
uid | date | phone | customername | altmobile | address | city | area |
productgroup | model | modelserialimg | productimg | complaintdetails |
dop | warrantystatus | chargeamount | paymentproofimg | paymentstatus |
status | servicecentre | cancelreason | createdat | verifiedby | verifiedat
```

### Tab: `Feedback` (for later, Option 3 — not needed for this build)
```
uid | q1 | q2 | q3 | q4 | q5 | q6 | q7 | q8 | q9 | flagged | flagreason | submittedat
```

## 4. Web app pages

### `/complaint` — the registration form
Multi-step, mirrors the original conversational flow but as form steps:

1. Product group (dropdown)
2. Model (dropdown, filtered by product group)
3. Eligibility result — if not in the eligible-models list, show "please
   hand this to your nearest service center" and stop here, no further
   steps
4. Customer name, alternate mobile, address, city, area
5. Photo upload: model/serial number, product photo
6. Complaint details (free text)
7. Date of purchase (date picker, not free-typed text — removes the
   DD/MM/YYYY parsing risk the WhatsApp version had)
8. Submit → calls `/api/complaint/register`

### `/complaint/warranty-result` (or inline step 8 continuation)
Shown immediately after submit, branches on the response:

- **In warranty:** ask for invoice photo upload → second submit →
  confirmation screen with the UID
- **Out of warranty:** show the charge amount, Accept/Decline buttons
  - Decline → one retry message (matches the WhatsApp version's "are you
    sure" step) → Accept or Cancel
  - Accept → show bank account details + a payment-proof upload field →
    submit → "Thank you, your payment is under review" screen (no UID
    shown yet — matches the earlier design, since a human still verifies
    the proof)
  - Cancel → "Your request has been logged as cancelled" screen, no UID

## 5. API routes

### `POST /api/complaint/warranty-check`
Thin wrapper — calls your existing n8n webhook rather than duplicating the
warranty rule in two codebases:
```js
const res = await fetch('https://n8n.srv1623198.hstgr.cloud/webhook/impex-warranty-check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ category, dop })
});
```
Returns `{ warrantystatus, chargeamount }` straight through to the form.
(If you'd rather the web app be fully independent of n8n for this step,
the logic is short enough to port directly — it's the same 12-month
constant + two-tier charge map already in `impex-warranty-check.json`.
Your call; reusing the webhook keeps the rule in one place.)

### `POST /api/complaint/register`
Does the actual write — same shape as your existing
`/api/pickup/create.js`:
1. Validate payload
2. Read `Complaints` tab, find the highest existing `IMX-KSA-SVC-NNNNN`
   sequence number, increment
3. Upload any submitted images to Google Drive (service account, same
   pattern as `/api/pickup/create.js` if it already handles files — if
   not, use `googleapis`'s Drive API directly), store the resulting
   shareable links
4. Append the row to `Complaints` with the right `status`:
   - IW → `REGISTERED`, UID assigned
   - OW + accepted → `PENDING_PAYMENT_VERIFICATION`, UID assigned but not
     yet sent
   - OW + cancelled → `OW_CANCELLED`, no UID
5. If status is `REGISTERED`, fire (fire-and-forget) the
   `impex-complaint-confirm` webhook so WhatsApp gets the UID message
6. Return `{ uid, status, warrantystatus, chargeamount }` to the form

Env vars needed (new, alongside your existing pickup ones):
```
GOOGLE_SERVICE_ACCOUNT_EMAIL   (reuse existing)
GOOGLE_PRIVATE_KEY             (reuse existing)
GOOGLE_CUSTOMER_SHEET_ID       (new — the customer-only spreadsheet)
GOOGLE_DRIVE_FOLDER_ID         (new — where complaint media gets stored)
```

## 6. Payment verification (unchanged from before)

Still handled in the `/admin` dashboard, still via n8n — this part doesn't
move to the new web app:
- `impex-payment-verify` (not yet built) — session-gated, called from a
  new Complaints tab in `/admin`, shows the uploaded payment-proof image,
  Approve/Reject buttons
- Approve → row status `REGISTERED`, fires `impex-complaint-confirm` with
  the UID
- Reject → customer gets a "please contact support" WhatsApp message

## 7. What's now redundant from the earlier n8n-only design

- `impex-complaint-register.json` (built earlier) — superseded. Its logic
  moves into `/api/complaint/register`. Keep the file around only as
  reference for the UID-generation and status-branching logic — don't
  wire it into Interakt.
- The Interakt flow script's steps 1–14 and 17–22 (all the detail
  collection) — replaced by the web form. Interakt only needs the menu →
  link handoff message.

## 8. Still to build

- The `/complaint` and `/complaint/warranty-result` pages themselves
  (you're building — this doc is the spec for that)
- `/api/complaint/warranty-check` and `/api/complaint/register`
- `impex-payment-verify` (n8n, admin-side approve/reject)
- The new `Complaints` tab in the admin dashboard
- The new Google Sheet, shared with the service account
- The `complaint_registration_confirmation` WhatsApp template (still
  needs Interakt approval — same requirement as before, unchanged by this
  redesign)
