# IMPEX Customer Module — Final Implementation Guide

This supersedes the wiring assumptions in earlier documents. The admin panel
went self-contained partway through this build, which means **two of the
four n8n workflows are no longer connected to anything** — this doc is the
accurate picture of what actually talks to what, right now.

---

## 1. The connection map — what calls what

| Web app file | Calls n8n? | Webhook | Purpose |
|---|---|---|---|
| `pages/api/complaint/eligibility.js` | **No** | — | Reads `data/eligible-models.json` locally |
| `pages/api/complaint/warranty-check.js` | **Yes** | `POST /webhook/impex-warranty-check` | Server-side proxy — pure lookup, no sheet access |
| `pages/api/complaint/register.js` | **Yes, conditionally** | `POST /webhook/impex-complaint-confirm` | Fire-and-forget, **only** fired for in-warranty (IW) registrations, to send `complaint_registration_confirmation` |
| `pages/api/admin/login.js` | **No** | — | Reads `Users`, writes `Sessions`, directly via `googleapis` |
| `pages/api/admin/complaints.js` | **No** | — | Reads `Complaints` directly via `googleapis` |
| `pages/api/admin/verify-payment.js` | **No** | — | Updates `Complaints` directly via `googleapis`, and calls **Interakt's API directly** (not through n8n) to send `payment_verified_confirmation` / `payment_rejected_notice` |

**n8n workflows still doing real work: 2 of 4.**

| n8n workflow | Status |
|---|---|
| `impex-warranty-check` | **Active, connected** — called by `warranty-check.js` |
| `impex-complaint-confirm` | **Active, connected** — called by `register.js` (IW path only) |
| `impex-complaints.json` | **Not connected to anything.** The admin panel reads the sheet directly instead. Leave unimported, or import and leave inactive |
| `impex-payment-verify.json` | **Not connected to anything.** `verify-payment.js` replaced it entirely — including the Interakt send, which now happens in the web app, not n8n |
| `impex-complaint-register.json` | **Not connected to anything.** Superseded by `register.js` from early on |

Why the split: `impex-warranty-check` and `impex-complaint-confirm` stayed
in n8n because they're stateless (no sheet dependency, or a fire-and-forget
send) — cheap to keep centralized. Everything that touches the `Complaints`
sheet or needs a session check moved into the web app once it got its own
direct Sheets/Drive access, since routing those through n8n would've meant
maintaining two separate Google identities with access to the same sheet.

---

## 2. What to implement, in order

### A. Google Sheet
- [ ] Add the `Sessions` tab (still the one blocking item):
      `sessionid | username | role | servicecentre | createdat | expiresat`
- [ ] Confirm `Users` and `Complaints` are exactly as built
- [ ] Confirm `Feedback` tab still exists (Option 3, not wired up yet)

### B. n8n
- [ ] Re-import the fixed `impex-warranty-check.json` (date + category
      handling correction) over the existing one — same node IDs, safe to
      overwrite
- [ ] Confirm `impex-complaint-confirm`'s Interakt API key is filled in and
      matches `INTERAKT_API_KEY` in Vercel — same account, same key, used
      from both places
- [ ] Leave `impex-complaints.json` and `impex-payment-verify.json`
      un-imported — no reason to activate them now

### C. Vercel environment variables
```
GOOGLE_SERVICE_ACCOUNT_EMAIL   (existing)
GOOGLE_PRIVATE_KEY             (existing)
GOOGLE_CUSTOMER_SHEET_ID       (existing)
GOOGLE_DRIVE_FOLDER_ID         (existing)
INTERAKT_API_KEY               (new - verify-payment.js needs this)
```

### D. Web app files to add (all delivered in earlier messages)
```
data/eligible-models.json
lib/googleAuth.js
lib/validateSession.js
pages/api/complaint/eligibility.js
pages/api/complaint/warranty-check.js
pages/api/complaint/register.js
pages/api/admin/login.js
pages/api/admin/complaints.js
pages/api/admin/verify-payment.js
pages/admin/login.js
pages/admin/complaints.js
pages/complaint/...            (form UI - not yet built, on you)
```

### E. npm packages
```
npm install googleapis formidable xlsx
```

### F. Category naming — fix before testing further
The `Television` vs `TV` mismatch from the last test hits **both**
`warranty-check.js` (now patched with aliases) **and** `eligibility.js`
(not patched — it needs an exact match against `eligible-models.json`
category keys). Check every value your form's product-group dropdown
actually sends and make sure it matches the category keys in
`eligible-models.json` exactly. This is a one-time fix at the form level,
cleaner than adding more aliases on the backend.

### G. Interakt
- [ ] Customer Complaint branch message uses the real URL with `{{1}}`
      bound to the phone attribute via the picker
- [ ] All three templates submitted and approved
- [ ] Confirm `impex-complaint-confirm`'s API key and `INTERAKT_API_KEY`
      in Vercel are the same value (see B above)

---

## 3. Full request flow, end to end

```
IN WARRANTY:
Customer → /complaint form → register.js
  → writes Complaints row (status: REGISTERED)
  → fires impex-complaint-confirm (n8n) → Interakt → WhatsApp
       (complaint_registration_confirmation)

OUT OF WARRANTY, accepted:
Customer → /complaint form → warranty-check.js → impex-warranty-check (n8n)
  → charge shown → payment proof uploaded → register.js
  → writes Complaints row (status: PENDING_PAYMENT_VERIFICATION)
  → (nothing sent yet - waits for admin action)

Staff → /admin/complaints → verify-payment.js
  → updates Complaints row (status: REGISTERED, paymentstatus: VERIFIED)
  → calls Interakt API directly → WhatsApp (payment_verified_confirmation)
  [reject path: paymentstatus: REJECTED → payment_rejected_notice]

OUT OF WARRANTY, cancelled:
Customer declines twice → register.js
  → writes Complaints row (status: OW_CANCELLED, no UID)
  → (nothing sent - silent log for visibility only)
```

Notice n8n only appears in the first two flows, and only for outbound
WhatsApp sends that don't need a session check. The admin-triggered flow
never touches n8n at all.
