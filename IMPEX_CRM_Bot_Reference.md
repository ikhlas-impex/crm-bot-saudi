# IMPEX CRM Bot — System Reference Summary

Companion doc to `IMPEX_System_Reference_Summary.md`. That doc covers the
**dealer pickup bot** (registration, pickup requests, ticket status on
`dealer.impexksa.com`). This doc covers a separate Interakt flow: the
**customer service / complaint & rating bot**, referred to here as the CRM
bot, pointing at `bot.impexksa.com`.

---

## Trigger

**When to trigger the workflow:** User sends a WhatsApp message
**Bot keyword:** `REG`

⚠️ Worth double-checking: `REG` usually reads as short for "Registration,"
but this flow doesn't do any registration — it's complaints and service
ratings. If that keyword was copied over from another flow by habit rather
than chosen deliberately, consider renaming the trigger tag to something
clearer (e.g. `CRM` or `SERVICE`) so it's not confused with the dealer bot's
registration path later.

---

## Flow diagram

```
[Trigger: keyword "REG"]
        │
        ▼
[Please choose your language / يرجى اختيار لغتك]
   ├─ "English"  ──────────────► [EN Welcome]
   └─ "العربية"  ──────────────► [AR Welcome]

[EN Welcome: "Welcome to Impex Customer Service!"]
   ├─ "Customer Complaint" ─────► [EN Complaint link message]
   └─ "Rate Our Service"   ─────► [EN Feedback link message]

[AR Welcome: "أهلاً بك في خدمة عملاء إمبكس"]
   ├─ "تقديم شكوى"     ─────► [AR Complaint link message]
   └─ "تقييم خدمتنا"   ─────► [AR Feedback link message]
```

No webhook nodes in this flow — unlike the dealer bot, this one appears to be
a pure link-handoff: the bot's only job is routing the dealer to the right
language-and-purpose link, and `bot.impexksa.com` presumably owns the actual
form submission and backend logic independently of Interakt/n8n. Confirm this
assumption is right — if `bot.impexksa.com` needs anything from Interakt
(e.g. dealer name pre-fill, ticket creation callbacks), that's not represented
here yet.

---

## Node content

### Language picker
**EN/AR combined (one message, shown before language is known):**
```
Please choose your language
يرجى اختيار لغتك
```
Buttons: `English` | `العربية`

### Welcome message

**EN**
```
Welcome to Impex Customer Service!
```
Buttons: `Customer Complaint` | `Rate Our Service`

**AR**
```
أهلاً بك في خدمة عملاء إمبكس
```
Buttons: `تقديم شكوى` | `تقييم خدمتنا`

### Customer Complaint link

**EN**
```
Please tap the link below and fill in your details:
https://bot.impexksa.com/complaint?phone={{1}}&lang=en
```

**AR**
```
يرجى الضغط على الرابط أدناه وتعبئة بياناتك:
https://bot.impexksa.com/complaint?phone={{1}}&lang=ar
```

### Rate Our Service (feedback) link

**EN**
```
To share your feedback about your completed service
Please click the link below:
https://bot.impexksa.com/feedback?phone={{1}}&lang=en
```

**AR**
```
لمشاركتك رأيك حول الخدمة المقدمة، يرجى الضغط على الرابط أدناه:
https://bot.impexksa.com/feedback?phone={{1}}&lang=ar
```

---

## Consistency with the dealer bot's bilingual pattern

This flow already follows the conventions established for the dealer bot:

- Buttons wired 1:1 per language (no cross-wiring between EN and AR branches)
- `&lang=en` / `&lang=ar` hardcoded directly into each static link message,
  rather than inserted via a variable — same reasoning as the dealer bot:
  since each language has its own message node anyway, there's nothing
  dynamic to resolve at send time.

**Open item carried over from the dealer bot's setup:** confirm whether the
language choice on this flow is also being saved (User Trait or Workflow
Variable) the same way as the dealer bot, or whether this flow relies purely
on the direct button-to-node wiring with no saved variable at all. If there's
no "Save user response" configured here, that's fine functionally (routing
still works via the button connections) — it only matters if you later want
this bot to also skip the language prompt for returning contacts, which would
need the same User Trait (`preferred_language`) the dealer bot uses, shared
across both bots since they're on the same Interakt account/contact base.

---

## `bot.impexksa.com` — front-end language handling

If this is a separate app/deployment from `dealer.impexksa.com`, it will need
its own implementation of the `lang` query-param detection described in
`IMPEX_WebApp_Language_Detection.md` (read `?lang=`, fall back to a cookie,
then `Accept-Language`, then default English) — that logic doesn't
automatically carry over just because the URL pattern matches. Let me know if
`bot.impexksa.com` is a different codebase and I can adapt that guide to it
specifically.
