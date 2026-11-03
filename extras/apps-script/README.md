# Connecting the forms (Google Apps Script)

The website's two forms (Bóka tíma, Biðlisti) send to a small script that lives inside
**Emilia's own** Google Sheet. Do this with Emilia logged in to her Google account; nothing
should end up in Marina's account.

1. In Emilia's Google Drive: new Google Sheet named **Fræið – skjólstæðingar (EINKA)**. Share with nobody.
2. In the sheet: **Extensions → Apps Script**. Delete what's there, paste in `Code.gs`, save.
3. At the top of the script, set `EMILIA_EMAIL` (the address she actually reads; until we know
   emilia@sjalfsvitund.is works, use her Gmail) and `REPLY_HOURS`.
4. Choose **testBooking** in the toolbar → **Run**. Google asks for permission (Sheets + send email):
   allow. Check: a "Beiðnir" tab appeared with one row, and two emails arrived (to Emilia + the auto-reply).
   Delete the test row.
5. **Deploy → New deployment → Web app**. Execute as: *Me*. Who has access: *Anyone*. Deploy, copy the URL
   (ends in `/exec`).
6. Paste that URL into `content/site.yml` → `form_endpoint:` and push. The forms are now live.
7. Test from a phone and a laptop: row appears, Emilia gets the email, the auto-reply arrives (check spam).

**Why "Anyone"?** The website visitor isn't logged in to Google, so the script must accept anonymous
posts. It only ever *adds* rows; it can't read the sheet back to anyone. The hidden "website" field
(honeypot) drops most spam bots.

**Changing the script later** needs a *new version* of the same deployment (Deploy → Manage deployments
→ edit → Version: New), otherwise the website keeps calling the old one. The URL stays the same.

Limits: a free Gmail account can send 100 script emails a day. Each booking uses 2.
