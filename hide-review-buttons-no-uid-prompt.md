Apply this change to `pages/admin/complaints.js`:

In the Review Status column (the one showing "✓ Checked" / "✗ Not
Checked" buttons and the Pending state), add a guard for complaints with
no UID - these are `OW_CANCELLED` requests, which by design never get a
UID since nothing was ever fulfilled. There's nothing meaningful to
review for them.

Wrap the existing Checked/Not Checked button logic so it only renders
when `c.uid` is truthy. When it's falsy, show a plain dash or "N/A"
instead - similar to how other columns already show "No action required"
for states that don't need action.

Example shape (adapt to match your actual JSX structure, since this file
has diverged from earlier versions):

```jsx
{!c.uid ? (
  <span style={{ color: '#666' }}>N/A</span>
) : !c.reviewstatus ? (
  <div style={{ display: 'flex', gap: 4 }}>
    <button onClick={() => markChecked(c.uid)}>✓ Checked</button>
    <button onClick={() => startCross(c.uid)}>✗ Not Checked</button>
  </div>
) : (
  // existing Checked/Not Checked badge display
)}
```

This is a frontend-only guard - it prevents the situation from being
triggered at all, rather than just handling the resulting error better.
It should be paired with the backend guard already added to
`impex-review-update` (returns a clear "no UID, cannot be reviewed"
message instead of a confusing Sheets error if this is somehow bypassed).
