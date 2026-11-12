# JoTay shop website

Plain HTML, CSS and a little JavaScript, with no build step and no framework. Open any page in a browser via a local web server, or upload the folder to any static host.

```
index.html  shop.html  bundles.html  waterproof.html  about.html
shipping.html  contact.html  thanks.html (Stripe "after payment" page)  404.html
data/products.json   ← ALL prices, stock, names, photos and Stripe links live here
product.html  ← product and bundle pages (gallery + buy button), opened as product.html?id=...
css/style.css  js/app.js  img/  fonts/  favicon.ico  sitemap.xml  robots.txt
deploy/        ← cloud-init.yaml, deploy.sh, DEPLOY.md (DigitalOcean Droplet)
tools/build_pages.py  ← optional: regenerates the HTML pages (shared header/footer)
```

## Preview on your computer
```bash
cd site
python3 -m http.server 8080
# open http://localhost:8080          (real view: unlinked items show "Coming soon")
# open http://localhost:8080/?preview=1 (shows "Buy now" on everything, to see the final look)
```
Opening the .html files by double-click won't load the products, because browsers block reading `products.json` from disk. Use the command above.

## Editing products, prices and stock
Everything is in `data/products.json`:
- `price` is in A$. `stock` is the number left: **0 shows "Sold out"** on the card and disables the buy button. In-stock items do not show a count.
- `pick: true` includes a piece in the Favourites section on the home page (no badge).
- `gallery` is the photo list on the product page (close-ups first, then worn shots). The first photo is the shop-card image.
- Bundles list the pieces inside them (`items`). Bundle stock is worked out automatically as the lowest stock of its pieces, so **when a bundle sells, lower the stock of each piece in it by 1**.
- After editing, run `./deploy/deploy.sh <droplet-ip>` to update the live site.
- Keep Stripe in sync too: use "Limit the number of payments" on each link (below), so Stripe stops selling when stock runs out even if the website hasn't been updated yet.

## Bag (cart) and one-checkout payments
- Every product and bundle page has **Buy now** (its own Stripe Payment Link) and **Add to bag**. The bag lives in the shopper's browser (localStorage `jotay-bag`); `bag.html` shows it.
- **Checkout** on the bag page calls `/api/cart/checkout`, a DigitalOcean Function in `api/` (component `api` of the same App Platform app). It only accepts the JoTay prices listed in `api/packages/cart/checkout/index.js`, checks stock in `data/products.json` (bundles count against their pieces), and opens one Stripe Checkout with free Australia Post shipping, AU addresses only.
- Each item's live Stripe price id is `stripePrice` in `data/products.json`. **New product:** add its `stripePrice` there and add the same price id (plus its test-mode id) to `PRICES` in the function.
- The Stripe key is an encrypted app env var `STRIPE_SECRET_KEY` (never in the repo). Bag orders show in Stripe with metadata `source: jotay-bag` and an `items` list.
- After paying, Stripe sends shoppers to `thanks.html?from=bag`, which empties the bag.
- Stock: lower `stock` in `data/products.json` after each sale. The bag checkout reads it live, so it won't sell more than the number shown.

## Stripe Payment Links (one per product and bundle)
Each item's `stripeLink` is a placeholder like `STRIPE_LINK_SPARKLE_TENNIS`. Until a real `https://buy.stripe.com/...` link is pasted in, the button shows "Coming soon" and can't be clicked.

**One-off setup (Stripe dashboard, in Jodie's name):**
1. Create the Stripe account at https://dashboard.stripe.com/register with Jodie's ABN, ID and bank account. Fees are 1.65% + A$0.30 per domestic card sale, GST included (https://stripe.com/au/pricing, checked 31 Oct 2026).
2. **Settings → Business → Public details:** business name JoTay, support email, and statement descriptor `JOTAY`.
3. **Settings → Branding:** upload `img/icon-512.png` and set the brand colour to `#E6197A` and accent to `#4FB8F0`.
4. **Product catalogue → Shipping rates → Create** one fixed rate in AUD:
   - "Free shipping – Australia Post" A$0.00

**For each product and bundle (repeat 25 times: 21 pieces + 4 bundles):**
1. **Payment Links → + New → Products → Add new product.** Name = the JoTay name. Upload its photo from `img/products/`. Price = one-off, **AUD**, same as `products.json`.
2. Tick **Collect customers' addresses → Billing and shipping addresses**, country **Australia** only, then **Add shipping rates** and pick the free Australia Post rate.
3. Tick **Require customers to provide a phone number** (helpful for delivery questions).
4. Tick **Limit the number of payments** and enter the stock number. Optional: add a custom "Sold out" message.
5. Optional: let customers adjust quantity (max = stock).
6. **After payment → Don't show confirmation page → Redirect** to `https://jotay.com.au/thanks.html`.
7. **Create link**, copy the `https://buy.stripe.com/...` URL and paste it into that item's `"stripeLink"` in `data/products.json`.

Test first in **Test mode** (toggle top right) with card `4242 4242 4242 4242`, then make the links again in Live mode. Test links don't take real money.

## Things that must be true before going live
- The Waterproof? page says **every style is tested by us** in the shower, pool and salt water. Do that test before launch, or change the wording.
- About page: Jodie should read it and make it her own words. her daughter is never named, only "my daughter".
- Replace `INSTAGRAM_URL` in `tools/build_pages.py` and run `python3 tools/build_pages.py`.
- Set up `jotayjewellery@gmail.com`, or change it in `tools/build_pages.py` (and the fallback message in `js/app.js`).
- Earrings: change-of-mind returns are excluded for hygiene, but faulty items are always covered under the ACL. That's already in the Shipping page.
- Never add photos showing a child's face. Hands, wrists and necklines only.
