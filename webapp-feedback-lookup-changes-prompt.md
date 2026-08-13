Apply these changes to the Next.js web app (crm-bot-saudi.vercel.app):

1. ADD a new file `pages/api/feedback/lookup.js` (attached). Given a phone
   number, it finds that customer's eligible complaints - status
   `REGISTERED` (service actually proceeded, not pending payment or
   cancelled) and not already rated in `Feedback` - and returns them.

2. REPLACE the entire contents of `pages/feedback/index.js` with the
   attached version. Changes from the previous version:
   - On load, if the URL has a `?phone=` param, it calls the new
     `lookup.js` automatically instead of showing the manual UID field
     first.
   - Exactly one eligible complaint found → skips straight to the
     questionnaire, no typing required.
   - More than one found → shows a short picker (UID, product, date) to
     choose from.
   - None found → shows a message with a button to fall back to manual
     UID entry.
   - No `?phone=` param at all (e.g., someone opens the link directly
     without going through WhatsApp) → falls back to the original manual
     UID entry step, unchanged.
   - `pages/api/feedback/validate.js` and `pages/api/feedback/submit.js`
     are UNCHANGED - the manual-entry and submission paths still work
     exactly as before, this only adds a shortcut in front of them.

3. NO OTHER FILES CHANGE. `lib/googleAuth.js`, the complaint module, and
   the admin panel are untouched by this update.

After applying: redeploy, then update the Interakt "Rate Our Service"
branch to send the link with the phone parameter restored:
`https://crm-bot-saudi.vercel.app/feedback?phone={{1}}` - bind `{{1}}` to
the phone attribute via the variable picker, same as the complaint
registration link. Without this param the page still works, it just
falls back to asking for the UID manually every time.
