# -*- coding: utf-8 -*-
"""Build the Fræið site: content/ + templates/ -> _site/

Content is edited by Emilia in Pages CMS; design lives in templates/ and static/.
Every page is built twice: Icelandic at /, English at /en/.
Run:  python3 build.py            (launch build: canonical URLs, sitemap, CNAME)
      python3 build.py --draft    (preview: noindex, no CNAME/sitemap)
      python3 build.py --draft --local   (also shows hidden blog posts; never deploy this)
"""
import os, sys, glob, shutil, datetime, hashlib
import yaml, markdown
from jinja2 import Environment, FileSystemLoader, select_autoescape
from markupsafe import Markup

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "_site")
C = lambda *p: os.path.join(ROOT, "content", *p)
DRAFT = "--draft" in sys.argv   # preview: search engines kept away
LOCAL = "--local" in sys.argv
LANGS = ["is", "en"]

def load_yml(path):
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}

def load_post(path):
    """Blog post: everything lives in the front matter (title, body... each with is/en)."""
    text = open(path, encoding="utf-8").read()
    meta = yaml.safe_load(text.split("---", 2)[1]) if text.startswith("---") else {}
    meta["slug"] = os.path.splitext(os.path.basename(path))[0]
    return meta

# ---- images: local uploads get web-size copies in _site/media/w<width>/ ----
def img(src, width=1200):
    if not src:
        return ""
    if src.startswith(("http://", "https://")):
        return src
    rel = src.lstrip("/")
    srcpath = os.path.join(ROOT, rel)
    if not os.path.exists(srcpath):
        print("  ! missing image:", rel)
        return ""
    name = os.path.splitext(os.path.basename(rel))[0] + ".jpg"
    outrel = "media/w%d/%s" % (width, name)
    outpath = os.path.join(OUT, outrel)
    if not os.path.exists(outpath) or os.path.getmtime(outpath) < os.path.getmtime(srcpath):
        from PIL import Image, ImageOps
        os.makedirs(os.path.dirname(outpath), exist_ok=True)
        im = ImageOps.exif_transpose(Image.open(srcpath))
        if im.mode in ("RGBA", "LA", "P"):   # transparent logos: flatten onto white (JPEG has no transparency)
            im = im.convert("RGBA")
            flat = Image.new("RGB", im.size, (255, 255, 255))
            flat.paste(im, mask=im.split()[-1])
            im = flat
        im = im.convert("RGB")
        im.thumbnail((width, width * 2))
        im.save(outpath, "JPEG", quality=82, optimize=True, progressive=True)
    return outrel

# Pages: key -> (template, content file). The key is also the folder name in the URL.
PAGES = [
    ("index", "index.html", "home.yml"),
    ("um-mig", "um-mig.html", "um-mig.yml"),
    ("klinisk-daleidsla", "service.html", "klinisk-daleidsla.yml"),
    ("hugraen-endurforritun", "service.html", "hugraen-endurforritun.yml"),
    ("fraedsla", "fraedsla.html", "fraedsla.yml"),
    ("kyrrd-heima", "kyrrd-heima.html", "kyrrd-heima.yml"),
    ("blogg", "blogg.html", None),
    ("hafa-samband", "hafa-samband.html", "hafa-samband.yml"),
]
# "medferdir" = the Treatments dropdown holding the two service pages.
NAV = ["index", "um-mig", "medferdir", "kyrrd-heima", "fraedsla", "blogg", "hafa-samband"]

def page_path(lang, key):
    """Path of a page inside _site, e.g. ('en', 'fraedsla') -> 'en/fraedsla/'."""
    base = "" if lang == "is" else "en/"
    return base if key == "index" else "%s%s/" % (base, key)

def main():
    site = load_yml(C("site.yml"))
    strings = load_yml(os.path.join(ROOT, "templates", "strings.yml"))
    services = {k: load_yml(C(k + ".yml")) for k in ("klinisk-daleidsla", "hugraen-endurforritun")}

    posts = [load_post(p) for p in glob.glob(C("blogg", "*.md"))]
    posts = [p for p in posts if p.get("show", True) or LOCAL]
    posts.sort(key=lambda p: str(p.get("date", "")), reverse=True)

    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    shutil.copytree(os.path.join(ROOT, "static"), os.path.join(OUT, "static"))

    env = Environment(loader=FileSystemLoader(os.path.join(ROOT, "templates")),
                      autoescape=select_autoescape(["html"]), trim_blocks=True, lstrip_blocks=True)
    # Version stamp for style.css/site.js: changes whenever they change, so browsers
    # don't keep showing an old cached copy (GitHub Pages caches files for 10 minutes).
    stamp = hashlib.md5(b"".join(open(os.path.join(ROOT, "static", f), "rb").read()
                                  for f in ("style.css", "site.js"))).hexdigest()[:8]
    env.globals.update(img=img, v=stamp)

    def render(template, outrel, lang, key, root=None, **ctx):
        if root is None:
            root = "../" * outrel.count("/")
        other = "en" if lang == "is" else "is"
        def t(obj):
            """Pick the current language from an {is:, en:} pair; plain text passes through."""
            if isinstance(obj, dict):
                return obj.get(lang) or obj.get("is") or ""
            return obj or ""
        def md(obj):
            return Markup(markdown.markdown(t(obj).strip()))
        def url(target_key, target_lang=None):
            return root + page_path(target_lang or lang, target_key)
        def when(d):
            d = d if isinstance(d, datetime.date) else datetime.date.fromisoformat(str(d))
            return "%d. %s %d" % (d.day, strings["months"][lang][d.month - 1], d.year) if lang == "is" \
                else "%d %s %d" % (d.day, strings["months"][lang][d.month - 1], d.year)
        html = env.get_template(template).render(
            site=site, s=strings, lang=lang, other=other, key=key, root=root,
            t=t, md=md, url=url, when=when, nav=NAV, services=services,
            draft=DRAFT,
            path=outrel, **ctx)
        outpath = os.path.join(OUT, outrel, "index.html") if outrel.endswith("/") or outrel == "" \
            else os.path.join(OUT, outrel)
        os.makedirs(os.path.dirname(outpath), exist_ok=True)
        with open(outpath, "w", encoding="utf-8") as f:
            f.write(html)

    urls = []
    for lang in LANGS:
        for key, template, content in PAGES:
            page = load_yml(C(content)) if content else {}
            rel = page_path(lang, key)
            render(template, rel, lang, key, page=page, posts=posts,
                   alt_path=page_path("en" if lang == "is" else "is", key))
            urls.append(rel)
        for p in posts:
            rel = "%sblogg/%s/" % ("" if lang == "is" else "en/", p["slug"])
            render("post.html", rel, lang, "blogg", page={}, post=p,
                   alt_path="%sblogg/%s/" % ("en/" if lang == "is" else "", p["slug"]))
            urls.append(rel)

    # 404 is served at any depth, so its links start from the domain root (/).
    # (On the github.io preview the site sits in a sub-folder, so these links only work after launch.)
    render("404.html", "404.html", "is", "404", root="/", page={}, alt_path="en/")

    open(os.path.join(OUT, ".nojekyll"), "w").close()
    if DRAFT:
        # Preview: keep search engines away until launch.
        open(os.path.join(OUT, "robots.txt"), "w").write("User-agent: *\nDisallow: /\n")
    else:
        dom = site["domain"].rstrip("/")
        open(os.path.join(OUT, "CNAME"), "w").write(dom.split("//", 1)[1] + "\n")
        open(os.path.join(OUT, "robots.txt"), "w").write("User-agent: *\nAllow: /\nSitemap: %s/sitemap.xml\n" % dom)
        today = datetime.date.today().isoformat()
        with open(os.path.join(OUT, "sitemap.xml"), "w") as f:
            f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
            for u in urls:
                f.write("  <url><loc>%s/%s</loc><lastmod>%s</lastmod></url>\n" % (dom, u, today))
            f.write("</urlset>\n")

    print("Built %d pages -> _site/%s" % (len(urls) + 1, "  (draft)" if DRAFT else ""))

if __name__ == "__main__":
    main()
