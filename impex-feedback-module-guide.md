# IMPEX Customer Feedback Module (Option 3) — Implementation Guide

Same pattern as the complaint/warranty module: Interakt only hands off a
link, the web app owns the whole flow, and n8n handles the one outbound
WhatsApp send that needs the Interakt API key.

---

## 1. Files to add to the web app

```
pages/feedback/index.js               (the whole UI: UID entry, form, thank-you)
pages/api/feedback/validate.js        (checks UID exists / already submitted)
pages/api/feedback/submit.js          (writes the row, flags, sends confirmation)
```

No new npm packages — reuses `googleapis` (already installed for the
complaint module) via the same `lib/googleAuth.js` helper.

## 2. The connection map

| File | Calls n8n? | Webhook | Purpose |
|---|---|---|---|
| `pages/api/feedback/validate.js` | No | — | Reads `Complaints` + `Feedback` tabs directly via `googleapis` |
| `pages/api/feedback/submit.js` | **Yes** | `POST /webhook/impex-feedback-confirm` | Awaited (not fire-and-forget — same lesson as the complaint-confirm bug) |

Only one n8n workflow involved: `impex-feedback-confirm`. It mirrors
`impex-complaint-confirm` exactly — Webhook → Prepare Message (phone
normalization) → Send WhatsApp → Respond.

## 3. Google Sheet — `Feedback` tab

14 columns, in this exact order (code writes by position, not by header
name lookup):
```
uid | q1_technician_behaviour | q2_technician_punctuality | q3_service_quality
| q4_resolution | q4_comment | q5_response_time | q6_overall_experience
| q7_product_satisfaction | q8_comments | q9_recommendation | flagged
| flagreason | submittedat
```

`submit.js` also reads `Complaints!A2:C` (uid + phone) to confirm the UID
exists and to find the phone number to message — the web app doesn't ask
the customer for their phone number anywhere in this flow.

## 4. n8n

- [ ] Import `impex-feedback-confirm.json`
- [ ] Paste in the real Interakt API key (same one used everywhere else)
- [ ] Confirm it's Published/active

## 5. Interakt

- [ ] Update the "Rate Our Service" branch to send:
  > "To share your feedback about your completed service, please tap the
  > link below: https://crm-bot-saudi.vercel.app/feedback"
  (No phone query param needed — `submit.js` looks the number up from the
  matched `Complaints` row via the UID instead.)

## 6. WhatsApp template

| Field | Value |
|---|---|
| Name | `feedback_confirmation` |
| Category | Utility |
| Language | English (en) |
| Variables | 1 — `{{1}}` = UID |
| Sample content for `{{1}}` | `IMX-KSA-SVC-00001` |
| Body | "Thank you for your valuable feedback! Your feedback has been successfully recorded against Service UID: {{1}}. Your feedback helps us improve our products and service quality. Thank you for choosing Impex. Have a great day!" |

- [ ] Submitted for approval
- [ ] Green dot (approved) before testing the full loop

## 7. Business logic implemented in the form/API

- UID must exist in `Complaints` to proceed
- If feedback already submitted for that UID, no form is shown —
  "already received" message instead
- After 3 failed UID attempts, the form disables and shows a Customer
  Care fallback message instead of a 4th retry
- Q4 = "Partially Resolved" or "Not Resolved" → shows a follow-up comment
  box, stored in `q4_comment`
- Q6 (Overall Experience) ≤ 5 → shows a "what went wrong" prompt and sets
  `flagged = TRUE`
- Q4 = "Not Resolved" also independently sets `flagged = TRUE`
- Both conditions can fire together — `flagreason` concatenates whichever
  applies
- Q8 defaults to `"NO"` if left blank

**Not built:** a view in `/admin` surfacing flagged feedback rows. They
currently only exist by opening the `Feedback` tab directly. Flag if you
want that added as a follow-on.

## 8. Full request flow

```
Customer → REG → Rate Our Service → link to /feedback
  → enters UID → validate.js checks Complaints + Feedback
      → not found: error, retry (max 3), then Customer Care fallback
      → already submitted: "already received" message, stop
      → valid, not yet submitted: show 9-question form
  → submits → submit.js
      → re-validates UID + submission status server-side
      → computes flagged/flagreason
      → appends row to Feedback
      → awaits impex-feedback-confirm (n8n) → Interakt → WhatsApp
          (feedback_confirmation, with the real UID)
  → thank-you screen shown in the web app regardless of whether the
    WhatsApp send succeeded (row is already saved either way)
```

## 9. Testing checklist

1. Valid UID with no prior feedback → questionnaire appears
2. Same UID again → "already received" message, no form
3. Nonsense UID × 3 → Customer Care fallback, input disabled
4. Q4 = "Partially Resolved" → comment box appears, required to feel complete (not enforced server-side as required, worth deciding if it should be)
5. Q6 = 4 → "what went wrong" prompt appears, submitted row has `flagged = TRUE` and a reason mentioning low score
6. Q4 = "Not Resolved" with Q6 = 8 → still `flagged = TRUE`, reason mentions unresolved issue, not low score
7. Submit → check WhatsApp for `feedback_confirmation` arriving at the correct number
8. Check `impex-feedback-confirm`'s n8n execution log shows a matching execution (proves the await is working, same check as the complaint module)
