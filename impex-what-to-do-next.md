# IMPEX Customer Complaint Module — What's Left To Do

Reflects the final architecture: single Interakt number with a 3-option
menu, web app at `crm-bot-saudi.vercel.app` handling both the public
`/complaint` form and a self-contained `/admin` panel with its own
Users/Sessions/Complaints/Feedback sheet.

---

## 1. Google Sheet (`CUSTOMER_SHEET`)

- [x] `Complaints` tab — done
- [x] `Users` tab — done (admin + 5 service-centre logins)
- [ ] **`Feedback` tab** — created earlier for the future Option 3 module, confirm it's still there
- [ ] **`Sessions` tab — still missing, blocks login entirely.** Add columns:
      `sessionid | username | role | servicecentre | createdat | expiresat`
      Nothing writes to it until it exists — `login.js` will fail on first
      use otherwise.

## 2. Vercel environment variables

| Variable | Status |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Should already be set (web app's Sheet/Drive connection) |
| `GOOGLE_PRIVATE_KEY` | Should already be set |
| `GOOGLE_CUSTOMER_SHEET_ID` | Set (`1ylyaIcC5b1x_fABeyd5nRz_6SBphZv0xP3FgUJHwE4g`) |
| `GOOGLE_DRIVE_FOLDER_ID` | Should already be set |
| **`INTERAKT_API_KEY`** | **New — add this.** `verify-payment.js` calls Interakt directly, no longer through n8n |

## 3. Files to add to the web app repo

Public form + its APIs (from earlier):
```
pages/complaint/...                  (form pages — build these, not provided as code)
pages/api/complaint/register.js
pages/api/complaint/warranty-check.js
pages/api/complaint/eligibility.js
data/eligible-models.json
```

Admin panel (this message's deliverables):
```
lib/googleAuth.js
lib/validateSession.js
pages/api/admin/login.js
pages/api/admin/complaints.js
pages/api/admin/verify-payment.js
pages/admin/login.js
pages/admin/complaints.js
```

## 4. npm packages to install

```
npm install googleapis formidable xlsx
```
- `googleapis` — Sheets + Drive access (register.js, admin routes)
- `formidable` — parses the multipart file uploads in register.js
- `xlsx` — SheetJS, used by the Export to Excel button in complaints.js

## 5. n8n — what's still relevant

| Workflow | Status |
|---|---|
| `impex-warranty-check` | **Keep, still used** — called from `warranty-check.js` |
| `impex-complaint-confirm` | **Keep, still used** — called from `register.js` for in-warranty (IW) confirmations |
| `impex-complaints.json` | Redundant — the admin panel now reads the sheet directly. Fine to leave unimported |
| `impex-payment-verify.json` | Redundant — replaced by `verify-payment.js`, which calls Interakt directly instead of relaying through this workflow. Fine to leave unimported |
| `impex-complaint-register.json` | Already superseded earlier by `register.js` — don't import |

## 6. Interakt

- [ ] Confirm the Customer Complaint branch message uses the real URL:
      `https://crm-bot-saudi.vercel.app/complaint?phone={{1}}`
- [ ] Confirm `{{1}}` is bound to the phone attribute via the variable
      picker, not typed
- [ ] Submit the three templates if not already approved:
      `complaint_registration_confirmation`, `payment_verified_confirmation`,
      `payment_rejected_notice`
- [ ] Confirm the Interakt API key used in `impex-complaint-confirm`
      (n8n) and `INTERAKT_API_KEY` (Vercel) are the **same** key — same
      number, same account, both places need it

## 7. Testing checklist, in order

1. Add the `Sessions` tab → log into `/admin/login` with the `admin` user
   → confirm redirect to `/admin/complaints` and an empty list loads
   without error
2. Log in as one of the service-centre users (e.g. `riyadh`) → confirm
   the list is empty/scoped correctly (no cross-centre data visible)
3. Submit a test **in-warranty** complaint through `/complaint` → confirm
   the row lands in `Complaints` with `status = REGISTERED` and the
   `complaint_registration_confirmation` WhatsApp message arrives
4. Submit a test **out-of-warranty** complaint, accept the charge, upload
   a payment proof → confirm the row lands as
   `PENDING_PAYMENT_VERIFICATION` and shows up in the admin panel's
   default filter
5. Click **Approve** → confirm the row updates to `REGISTERED` /
   `VERIFIED` and `payment_verified_confirmation` arrives on WhatsApp
6. Submit another OW test, this time click **Reject** → confirm
   `paymentstatus` becomes `REJECTED`, `cancelreason` is populated, and
   `payment_rejected_notice` arrives
7. Test the **OW cancelled** path (decline the charge twice) → confirm a
   row is logged with `status = OW_CANCELLED` and no UID
8. Test an **ineligible model** → confirm the correct routing message and
   no row is created
9. Export to Excel from the admin panel → confirm the file opens cleanly
