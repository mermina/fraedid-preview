# Fræið website (sjalfsvitund.is)

Emilia Christina Gylfadóttir's practice site. Built by Marina Ermina with AI assistance.
Spec: `../PRD.md` (v3, approved 3 Nov 2026). Same stack as Natasha's site.

## How it works
```
content/      Emilia's words, prices, photos, posts  ← edited in Pages CMS (.pages.yml)
templates/    page layouts + interface words          ← design, kept by Marina
static/       style.css, site.js, favicon
media/        uploaded photos (Pages CMS puts them here)
build.py      content + templates → _site/ (every page in IS at / and EN at /en/)
extras/apps-script/   the Google Apps Script that receives the two forms
.github/workflows/deploy.yml   GitHub builds and publishes on every save
```
Every text in `content/` is a pair: `is:` (Icelandic, main) and `en:` (English).
If an English text is empty, the Icelandic one is shown.

## Preview on this Mac
```bash
python3 build.py --draft
```
then open the "fraedid-website" preview (port 8652). `--draft` adds yellow questions for Emilia
(from `templates/draft-notes.yml`) and tells search engines to stay away. `--local` also shows hidden blog posts.

## Launch checklist (short; full one in SETUP/references/website-go-live-checklist.md)
1. Repo in **Emilia's** GitHub account; Settings → Pages → Source = GitHub Actions.
2. Forms connected (`extras/apps-script/README.md`), real test sent from a phone.
3. Remove `--draft` in `deploy.yml` → build writes `CNAME`, `sitemap.xml`, canonical + hreflang tags for sjalfsvitund.is.
4. Point the domain's DNS to GitHub Pages (from her registrar), then tick "Enforce HTTPS".
5. Emilia has approved every text in both languages and the soft-claims changes **in writing**.
6. Real photo of Emilia in `content/home.yml` → `about.photo`; logo files replace the stand-in "f" mark.
7. Fonts: currently Google Fonts. Consider self-hosting (privacy: visitors' IPs go to Google).

## Preview hosting (temporary, 3 Nov 2026)
Preview repo: `mermina/fraedid-preview` (public, needed for free GitHub Pages). First-time setup, run in this folder:
```bash
gh repo create mermina/fraedid-preview --public --source . --remote origin --push
gh api -X POST repos/mermina/fraedid-preview/pages -f build_type=workflow
```
Preview URL: https://mermina.github.io/fraedid-preview/ (the 404 page's links only work on the real domain).
At launch: transfer the repo to Emilia's account (Settings → Transfer) or push it to a new repo there.
