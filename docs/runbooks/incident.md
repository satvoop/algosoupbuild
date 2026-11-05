# Incident runbook

1. **Confirm.** Reproduce it, or read the error and the time it started. Check
   `/api/health` for which build is live.
2. **Contain.** If the latest deploy caused it: promote the previous deployment in Vercel
   (Deployments > previous > Promote). Code rollback takes seconds; schema does not roll
   back, so a bad migration is fixed forward with a new migration.
3. **Credentials.** If a secret may have leaked: rotate it first (Supabase keys, Vercel
   variables), then investigate.
4. **Record.** Write a bug card: what users saw, when, the cause, the fix, the class of
   bug and where else it could exist.
5. **Personal data.** If personal data may have been exposed, the owner decides within 72
   hours whether it is reportable to the ICO. Start the clock at discovery.
