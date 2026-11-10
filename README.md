# JoTay shop website

Plain HTML, CSS and a little JavaScript, with no build step and no framework. Open any page in a browser via a local web server, or upload the folder to any static host.

```
index.html  shop.html  bundles.html  waterproof.html  about.html
shipping.html  contact.html  thanks.html (Stripe "after payment" page)  404.html
data/products.json   ← ALL prices, stock, names and Stripe links live here
css/style.css  js/app.js  img/  fonts/  favicon.ico  sitemap.xml  robots.txt
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
- `price` is in A$. `stock` is the number left: **0 shows "Sold out"**, 1 shows "Last one!", 2–3 show "Only N left".
- `pick: true` puts a piece in "Jodie's picks" on the home page.
- Bundles list the pieces inside them (`items`). Bundle stock is worked out automatically as the lowest stock of its pieces, so **when a bundle sells, lower the stock of each piece in it by 1**.
- Keep Stripe in sync too: use "Limit the number of payments" on each link (below), so Stripe stops selling when stock runs out even if the website hasn't been updated yet.

## Stripe Payment Links (one per product and bundle)
Each item's `stripeLink` is a placeholder like `STRIPE_LINK_SPARKLE_TENNIS`. Until a real `https://buy.stripe.com/...` link is pasted in, the button shows "Coming soon" and can't be clicked.

**One-off setup (Stripe dashboard, in Jodie's name):**
1. Create the Stripe account at https://dashboard.stripe.com/register with Jodie's ABN, ID and bank account. Fees are 1.65% + A$0.30 per domestic card sale, GST included (https://stripe.com/au/pricing, checked 31 Oct 2026).
2. **Settings → Business → Public details:** business name JoTay, support email, and statement descriptor `JOTAY`.
3. **Settings → Branding:** upload `img/icon-512.png` and set the brand colour to `#E6197A` and accent to `#4FB8F0`.
4. **Product catalogue → Shipping rates → Create** two fixed rates in AUD:
   - "Australia Post" A$10.20 (delivery estimate 2–8 business days)
   - "Free porch pickup (Darwin)" A$0.00

**For each product and bundle (repeat 25 times: 21 pieces + 4 bundles):**
1. **Payment Links → + New → Products → Add new product.** Name = the JoTay name. Upload its photo from `img/products/`. Price = one-off, **AUD**, same as `products.json`.
2. Tick **Collect customers' addresses → Billing and shipping addresses**, country **Australia** only, then **Add shipping rates** and pick both rates above.
3. Tick **Require customers to provide a phone number** (handy for porch pickups).
4. Tick **Limit the number of payments** and enter the stock number. Optional: add a custom "Sold out" message.
5. Optional: let customers adjust quantity (max = stock).
6. **After payment → Don't show confirmation page → Redirect** to `https://jotay.com.au/thanks.html`.
7. **Create link**, copy the `https://buy.stripe.com/...` URL and paste it into that item's `"stripeLink"` in `data/products.json`.

Test first in **Test mode** (toggle top right) with card `4242 4242 4242 4242`, then make the links again in Live mode. Test links don't take real money.

## Things that must be true before going live
- The Waterproof? page says **every style is tested by us** in the shower, pool and salt water. Do that test before launch, or change the wording.
- About page: Jodie should read it and make it her own words. her daughter is never named, only "my daughter".
- Add the Instagram URL on the site once the account is ready.
- Set up `hello@jotay.com.au`, or change the contact email in the HTML pages and the fallback message in `js/app.js`.
- Earrings: change-of-mind returns are excluded for hygiene, but faulty items are always covered under the ACL. That's already in the Shipping page.
- Porch pickup gives buyers your home address. Consider a pickup spot, time window or letterbox system you're comfortable with.
- Never add photos showing a child's face. Hands, wrists and necklines only.
