1) Add auth
   - Use Supabase Auth so people can sign in and reopen their old sessions on any device.
   - Save on the device whatever we can (localStorage/IndexedDB: board strokes, notes, PDF view state, recent turns) for instant load and offline use.
   - Sync the rest to our Supabase DB per user (session list, metadata, tutor history, uploaded PDFs in Supabase Storage), with row-level security so users only see their own data.
   - On sign-in, merge the local session into the account; signed-out users keep working in local-only mode.

   2) Check if Jev could be integrated in our use case
   3) Also need to build select the text from the document and then able to ask our voice agent. For ex - after uploading a pdf, while reading if we dont want to use white board and just read the pdf so we should be able to ask it with the context of selected text as well, or else it would take the context of the visible page content. 
   4) define all necessary tools and definitions
