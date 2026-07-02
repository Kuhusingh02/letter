# A Letter Forward

Write a letter to your future self. Amber reflects on it, you seal it, and it's
emailed back to you on a date you choose — the letter opens on a hosted page.

Made by [AmberMind](https://www.ambermind.ai) — a journal that talks back.

## This repo (the website)

Static site, no build step:

- `index.html` — write → Amber reflects → seal
- `read.html` — where a delivered letter opens (seal-breaking reveal)
- `style.css`, `app.js`

Deploy: publish this folder's root (nothing to build).

The backend (Supabase edge functions, schema, cron) is kept **out** of this repo
so no secrets ship to the static host.
