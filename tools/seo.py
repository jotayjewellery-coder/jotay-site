#!/usr/bin/env python3
"""Rewrites the SEO tags in every page's <head> (title, description, canonical, Open Graph,
Twitter, JSON-LD), plus sitemap.xml and robots.txt, from data/products.json.
Safe to run again any time. Run it after changing products.json (prices, stock, names):
    python3 tools/seo.py
"""
import html, json, os, re, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://jotay.com.au"
INSTAGRAM = "https://www.instagram.com/jotay_jewellery/"
EMAIL = "jotayjewellery@gmail.com"
# Google Search Console "HTML tag" code (just the content="..." value). Leave empty if verified by DNS.
GOOGLE_SITE_VERIFICATION = ""
DEFAULT_IMG = (SITE + "/img/og-image.jpg", 1200, 630, "JoTay bright waterproof jewellery")

PAGES = {  # file: (path, title, description, index?)
    "index.html": ("/", "JoTay | Waterproof Jewellery That Won't Go Green | Darwin",
        "Bright, fun stainless steel jewellery you can swim, shower and sweat in. It won't go green or tarnish. From A$29, with free shipping Australia-wide from Darwin, NT.", True),
    "shop.html": ("/shop.html", "Shop Waterproof Necklaces, Bracelets & Earrings | JoTay",
        "Waterproof stainless steel necklaces, bracelets, earrings and anklets from A$29. Wear them in the pool, the surf and the shower. Free shipping Australia-wide.", True),
    "bundles.html": ("/bundles.html", "Christmas Jewellery Gift Bundles from A$49 | JoTay",
        "Ready-to-gift waterproof jewellery bundles for mums, daughters, besties and teens. Cheaper than buying the pieces separately, with free shipping Australia-wide.", True),
    "waterproof.html": ("/waterproof.html", "Is JoTay Jewellery Waterproof? Care & FAQ | JoTay",
        "Yes, you can swim and shower in it. How our stainless steel jewellery handles chlorine, salt water and sunscreen, why it won't go green, and easy care tips.", True),
    "about.html": ("/about.html", "About JoTay | A Swim Teacher's Jewellery Brand from Darwin",
        "JoTay is Jodie, a Darwin swim teacher and mum, and her daughter. Bright, affordable waterproof jewellery made for the pool, the beach and every day.", True),
    "shipping.html": ("/shipping.html", "Free Shipping Australia-Wide & Returns | JoTay",
        "Every JoTay order ships free with Australia Post, anywhere in Australia, posted from Darwin within 2 business days. Our returns and faulty-item policy, in plain English.", True),
    "contact.html": ("/contact.html", "Contact JoTay | Waterproof Jewellery, Darwin NT",
        "Questions about an order, sizing or a gift? Email jotayjewellery@gmail.com or message @jotay_jewellery on Instagram. We're a small family business in Darwin.", True),
    "bag.html": ("/bag.html", "Your bag | JoTay", "Your JoTay bag. Mix and match pieces and pay once, with free shipping Australia-wide.", False),
    "thanks.html": ("/thanks.html", "Thank you for your order | JoTay", "Thanks for shopping with JoTay. Your order is on its way to being packed in Darwin.", False),
    "404.html": ("/404.html", "Page not found | JoTay", "Sorry, this page doesn't exist. Shop waterproof jewellery that won't go green at JoTay.", False),
}
CAT_SINGULAR = {"necklaces": "Necklace", "bracelets": "Bracelet", "earrings": "Earrings", "anklets": "Anklet"}

def esc(s): return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;")
def money(n): return ("%.2f" % n)

def organization():
    return {"@context": "https://schema.org", "@type": "Organization", "name": "JoTay", "url": SITE + "/",
            "logo": SITE + "/img/icon-512.png", "email": EMAIL, "sameAs": [INSTAGRAM],
            "description": "Bright, affordable waterproof stainless steel jewellery from Darwin, NT.",
            "address": {"@type": "PostalAddress", "addressLocality": "Darwin", "addressRegion": "NT", "addressCountry": "AU"}}

def website():
    return {"@context": "https://schema.org", "@type": "WebSite", "name": "JoTay", "url": SITE + "/"}

def product_ld(item, url, stock, images, desc, cat):
    ld = {"@context": "https://schema.org", "@type": "Product", "name": item["name"], "image": images,
          "description": desc, "sku": item["id"], "brand": {"@type": "Brand", "name": "JoTay"},
          "material": "Stainless steel",
          "offers": {"@type": "Offer", "url": url, "priceCurrency": "AUD", "price": money(item["price"]),
                     "availability": "https://schema.org/" + ("InStock" if stock > 0 else "OutOfStock"),
                     "itemCondition": "https://schema.org/NewCondition",
                     "seller": {"@type": "Organization", "name": "JoTay"},
                     "shippingDetails": {"@type": "OfferShippingDetails",
                         "shippingRate": {"@type": "MonetaryAmount", "value": "0.00", "currency": "AUD"},
                         "shippingDestination": {"@type": "DefinedRegion", "addressCountry": "AU"}}}}
    if cat: ld["category"] = cat
    return ld

def head_block(path, title, desc, index, img, lds):
    url = SITE + path
    out = ["<!-- seo:start (generated by tools/seo.py) -->",
           '<title>%s</title>' % esc(title),
           '<meta name="description" content="%s">' % esc(desc)]
    if not index: out.append('<meta name="robots" content="noindex">')
    if path == "/" and GOOGLE_SITE_VERIFICATION:
        out.append('<meta name="google-site-verification" content="%s">' % esc(GOOGLE_SITE_VERIFICATION))
    out += ['<link rel="canonical" href="%s">' % url,
            '<meta property="og:type" content="%s">' % ("product" if lds and lds[0]["@type"] == "Product" else "website"),
            '<meta property="og:site_name" content="JoTay">',
            '<meta property="og:title" content="%s">' % esc(title),
            '<meta property="og:description" content="%s">' % esc(desc),
            '<meta property="og:url" content="%s">' % url,
            '<meta property="og:image" content="%s">' % img[0],
            '<meta property="og:image:width" content="%d">' % img[1],
            '<meta property="og:image:height" content="%d">' % img[2],
            '<meta property="og:image:alt" content="%s">' % esc(img[3]),
            '<meta property="og:locale" content="en_AU">',
            '<meta name="twitter:card" content="summary_large_image">',
            '<meta name="twitter:title" content="%s">' % esc(title),
            '<meta name="twitter:description" content="%s">' % esc(desc),
            '<meta name="twitter:image" content="%s">' % img[0],
            '<meta name="twitter:image:alt" content="%s">' % esc(img[3])]
    for ld in lds:
        out.append('<script type="application/ld+json">%s</script>' % json.dumps(ld, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/"))
    out.append("<!-- seo:end -->")
    return "\n".join(out)

STRIP = re.compile(r'(<!-- seo:start.*?<!-- seo:end -->\n?)|'
                   r'(<title>.*?</title>\n?)|(<meta name="(description|robots|google-site-verification)"[^>]*>\n?)|(<link rel="canonical"[^>]*>\n?)|'
                   r'(<meta (property|name)="(og|twitter):[^"]*"[^>]*>\n?)|(<script type="application/ld\+json">.*?</script>\n?)', re.S)

def rewrite(file, block):
    p = os.path.join(ROOT, file)
    s = open(p, encoding="utf-8").read()
    head_end = s.index("</head>")
    head, rest = s[:head_end], s[head_end:]
    head = STRIP.sub("", head)
    anchor = re.search(r'<meta name="viewport"[^>]*>\n', head)
    head = head[:anchor.end()] + block + "\n" + head[anchor.end():]
    open(p, "w", encoding="utf-8").write(head + rest)

def main():
    data = json.load(open(os.path.join(ROOT, "data/products.json"), encoding="utf-8"))
    by_id = {p["id"]: p for p in data["products"]}
    for f, (path, title, desc, index) in PAGES.items():
        lds = [organization(), website()] if f == "index.html" else []
        rewrite(f, head_block(path, title, desc, index, DEFAULT_IMG, lds))
    urls = [PAGES[f][0] for f in PAGES if PAGES[f][3]]
    for item in data["products"] + data["bundles"]:
        bundle = "items" in item
        pieces = [by_id[i] for i in item.get("items", []) if i in by_id]
        stock = min(p["stock"] for p in pieces) if bundle else item["stock"]
        path = "/p/%s.html" % item["id"]
        if bundle:
            title = "%s | Waterproof Jewellery Gift Bundle | JoTay" % item["name"]
            extra = " Gift-ready, won't go green, A$%d with free shipping Australia-wide." % item["price"]
            cat = "Jewellery gift set"
        else:
            kind = CAT_SINGULAR.get(item["category"], "Jewellery")
            tone = item.get("finish", "").split(" with ")[0]
            title = "%s | Waterproof %s %s | JoTay" % (item["name"], tone, kind)
            if len(title) > 65: title = "%s | Waterproof %s | JoTay" % (item["name"], kind)
            extra = " Stainless steel that won't go green. A$%d, free shipping Australia-wide from Darwin." % item["price"]
            cat = kind
        desc = item["description"].strip() + extra
        imgs = [SITE + "/" + g["imageFallback"] for g in (item.get("gallery") or [{"imageFallback": item["imageFallback"]}])]
        first_alt = item.get("alt") or item["name"]
        lds = [product_ld(item, SITE + path, stock, imgs, item["description"].strip(), cat)]
        rewrite("p/%s.html" % item["id"], head_block(path, title, desc, True, (imgs[0], 1200, 1200, first_alt), lds))
        urls.append(path)
    today = datetime.date.today().isoformat()
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sm += ["  <url><loc>%s%s</loc><lastmod>%s</lastmod></url>" % (SITE, u, today) for u in urls]
    sm.append("</urlset>")
    open(os.path.join(ROOT, "sitemap.xml"), "w").write("\n".join(sm) + "\n")
    open(os.path.join(ROOT, "robots.txt"), "w").write(
        "User-agent: *\nDisallow: /thanks.html\nDisallow: /bag.html\nDisallow: /api/\n\nSitemap: %s/sitemap.xml\n" % SITE)
    print("updated %d pages, %d sitemap urls" % (len(PAGES) + len(data["products"]) + len(data["bundles"]), len(urls)))

if __name__ == "__main__":
    main()
