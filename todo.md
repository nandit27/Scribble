1) Add auth
   - Use Supabase Auth so people can sign in and reopen their old sessions on any device.
   - Save on the device whatever we can (localStorage/IndexedDB: board strokes, notes, PDF view state, recent turns) for instant load and offline use.
   - Sync the rest to our Supabase DB per user (session list, metadata, tutor history, uploaded PDFs in Supabase Storage), with row-level security so users only see their own data.
   - On sign-in, merge the local session into the account; signed-out users keep working in local-only mode.
