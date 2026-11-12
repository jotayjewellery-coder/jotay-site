/* JoTay bag checkout: turns the shopper's bag into ONE Stripe Checkout Session.
 * Input (POST JSON): { "items": [ { "price": "price_...", "quantity": 1 }, ... ] }
 * Output: { "url": "https://checkout.stripe.com/..." }
 * Only the JoTay prices listed below are accepted. Stock is checked against the
 * live data/products.json (bundles use the stock of the pieces inside them).
 * Secrets come from env vars only (STRIPE_SECRET_KEY). Never log them.
 * When adding a product: add its live price id here (and the test-mode price id). */
"use strict";
const https = require("https");
const http = require("http");

// live price id -> JoTay id, amount in cents, matching test-mode price id
const PRICES = {
  "price_1Ua8FML2hJa9Hiku0YPw6QOF": { id: "little-pearl-drop", amount: 2900, test: "price_1Ua4zqLb1Lw6a5ptTRRMrsot" },
  "price_1Ua8FML2hJa9Hiku39RQZN2z": { id: "toggle-heart", amount: 3900, test: "price_1Ua4zyLb1Lw6a5ptP01BMjei" },
  "price_1Ua8FML2hJa9Hikuh3LGkSQm": { id: "forever-loop", amount: 3900, test: "price_1Ua507Lb1Lw6a5pthTRkmRgr" },
  "price_1Ua8FML2hJa9HikuJdJ4mqvZ": { id: "big-love-heart", amount: 3500, test: "price_1Ua50FLb1Lw6a5ptXwqIjY9y" },
  "price_1Ua8FML2hJa9HikuSeJNlCKT": { id: "island-flower-chain", amount: 3900, test: "price_1Ua50MLb1Lw6a5ptNDCECPb6" },
  "price_1Ua8FLL2hJa9Hiku1g0s4mNy": { id: "two-hearts", amount: 2900, test: "price_1Ua50WLb1Lw6a5ptRbgXVcij" },
  "price_1Ua8FLL2hJa9HikuhzNQSbOI": { id: "starlight-solitaire", amount: 2900, test: "price_1Ua50dLb1Lw6a5ptVvPL3r1N" },
  "price_1Ua8FLL2hJa9HikuVeHwZTYt": { id: "raindrop-sparkle", amount: 2900, test: "price_1Ua50mLb1Lw6a5ptw9TDSelc" },
  "price_1Ua8FLL2hJa9HikugQYgAizh": { id: "sparkle-heart", amount: 2900, test: "price_1Ua50uLb1Lw6a5ptZngTl7fq" },
  "price_1Ua8FLL2hJa9HikuBsYipMPg": { id: "pink-lemonade-drop", amount: 2900, test: "price_1Ua511Lb1Lw6a5ptqMWMZJ8Z" },
  "price_1Ua8FLL2hJa9Hiku50goUjJD": { id: "lucky-eye", amount: 2900, test: "price_1Ua518Lb1Lw6a5pt1urm5B48" },
  "price_1Ua8FLL2hJa9Hiku6wLw49R8": { id: "big-chunk-chain", amount: 3900, test: "price_1Ua51GLb1Lw6a5ptKAzDTMbn" },
  "price_1Ua8FLL2hJa9HikuMAoMoZD7": { id: "sparkle-tennis", amount: 3900, test: "price_1Ua51NLb1Lw6a5ptKzM40uw1" },
  "price_1Ua8FLL2hJa9HikuHRnkODqY": { id: "double-trouble", amount: 2900, test: "price_1Ua51TLb1Lw6a5ptYTpA0v1y" },
  "price_1Ua8FLL2hJa9HikuPE1OiXSo": { id: "heart-charm-bracelet", amount: 3900, test: "price_1Ua51dLb1Lw6a5ptneush8XA" },
  "price_1Ua8FKL2hJa9HikuHpjxfUk4": { id: "daisy-days", amount: 2900, test: "price_1Ua51kLb1Lw6a5ptg065tMjX" },
  "price_1Ua8FKL2hJa9HikuiIuJqs7S": { id: "sparkle-huggies", amount: 2900, test: "price_1Ua51uLb1Lw6a5ptgZsO43JO" },
  "price_1Ua8FKL2hJa9HikuLmneXxfk": { id: "rainbow-drops", amount: 3500, test: "price_1Ua522Lb1Lw6a5pt1oCNVGmG" },
  "price_1Ua8FKL2hJa9HikuzgzVgtFk": { id: "everyday-sparkle-studs", amount: 2900, test: "price_1Ua528Lb1Lw6a5ptuHce80vp" },
  "price_1Ua8FKL2hJa9HikutpRORm5r": { id: "little-love-studs", amount: 2900, test: "price_1Ua52HLb1Lw6a5ptc5lMUKbf" },
  "price_1Ua8FKL2hJa9Hikurv5C6fZH": { id: "beach-day-anklet", amount: 2900, test: "price_1Ua52PLb1Lw6a5pt46GnDOdr" },
  "price_1Ua8FKL2hJa9HikuYqDpf9lr": { id: "mum-and-me-hearts", amount: 4900, test: "price_1Ua52XLb1Lw6a5ptiBWLTCdJ" },
  "price_1Ua8FKL2hJa9HikuymgiisG5": { id: "sparkle-stack", amount: 6900, test: "price_1Ua52gLb1Lw6a5ptV4FCr49h" },
  "price_1Ua8FKL2hJa9HikudXbeX5NE": { id: "earring-stack", amount: 6900, test: "price_1Ua52oLb1Lw6a5ptzE9rUrTW" },
  "price_1Ua8FKL2hJa9HikuI5JYJbIh": { id: "pink-pop-set", amount: 4900, test: "price_1Ua52xLb1Lw6a5ptZUUxUiaC" }
};
const SHIPPING_RATE = { live: "shr_1Ua8FKL2hJa9HikuiJeepVrm", test: "shr_1Ua5MNLb1Lw6a5pt3SSegZKu" };
const MAX_LINES = 25;
const MAX_QTY = 10;

function reply(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: obj };
}

function request(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const req = (url.startsWith("http:") ? http : https).request(url, { method, headers, timeout: 10000 }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function form(obj, prefix, out) {
  out = out || [];
  for (const k of Object.keys(obj)) {
    const key = prefix ? prefix + "[" + k + "]" : k;
    const v = obj[k];
    if (v !== null && typeof v === "object") form(v, key, out);
    else out.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(v)));
  }
  return out.join("&");
}

function parseItems(args) {
  let items = args.items;
  if (!items && args.__ow_body) {
    try {
      const raw = /^[A-Za-z0-9+/=\s]+$/.test(args.__ow_body) && !args.__ow_body.trim().startsWith("{")
        ? Buffer.from(args.__ow_body, "base64").toString("utf8") : args.__ow_body;
      items = JSON.parse(raw).items;
    } catch (e) { items = null; }
  }
  if (typeof items === "string") { try { items = JSON.parse(items); } catch (e) { items = null; } }
  return Array.isArray(items) ? items : null;
}

async function main(args) {
  const method = String(args.__ow_method || "post").toLowerCase();
  if (method !== "post") return reply(405, { error: "Use POST" });
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (!key) return reply(500, { error: "Checkout is not set up yet" });
  const mode = /^(sk|rk)_live_/.test(key) ? "live" : "test";
  const site = (process.env.SITE_URL || "https://www.jotay.com.au").replace(/\/+$/, "");

  const items = parseItems(args);
  if (!items || !items.length) return reply(400, { error: "Your bag is empty" });
  if (items.length > MAX_LINES) return reply(400, { error: "Too many items in the bag" });

  // merge duplicates, validate against the allowlist
  const qty = {};
  for (const it of items) {
    const p = it && PRICES[it.price];
    const q = Number(it && it.quantity);
    if (!p) return reply(400, { error: "Something in your bag is no longer available. Please remove it and try again." });
    if (!Number.isInteger(q) || q < 1 || q > MAX_QTY) return reply(400, { error: "Please check the quantities in your bag" });
    qty[it.price] = (qty[it.price] || 0) + q;
  }

  // stock check against the live products.json
  let data;
  try {
    const r = await request("GET", site + "/data/products.json", { "Cache-Control": "no-cache" });
    if (r.status !== 200) throw new Error("status " + r.status);
    data = JSON.parse(r.body);
  } catch (e) {
    return reply(503, { error: "Checkout is busy. Please try again in a minute." });
  }
  const stock = {}, bundles = {}, names = {};
  data.products.forEach((p) => { stock[p.id] = Number(p.stock) || 0; names[p.id] = p.name; });
  data.bundles.forEach((b) => { bundles[b.id] = b.items; names[b.id] = b.name; });
  const need = {};
  for (const price of Object.keys(qty)) {
    const id = PRICES[price].id;
    const pieces = bundles[id] || [id];
    for (const piece of pieces) need[piece] = (need[piece] || 0) + qty[price];
  }
  for (const piece of Object.keys(need)) {
    if (!(piece in stock)) return reply(400, { error: "Something in your bag is no longer available." });
    if (need[piece] > stock[piece]) {
      const left = stock[piece];
      return reply(409, { error: left > 0
        ? "Sorry, we only have " + left + " " + names[piece] + " left. Please lower the quantity in your bag (bundles include it too)."
        : "Sorry, " + names[piece] + " has just sold out. Please remove it from your bag." });
    }
  }

  const lineItems = {};
  const summary = [];
  Object.keys(qty).forEach((price, i) => {
    lineItems[i] = { price: mode === "live" ? price : PRICES[price].test, quantity: qty[price] };
    summary.push(PRICES[price].id + " x" + qty[price]);
  });
  const params = {
    mode: "payment",
    line_items: lineItems,
    shipping_address_collection: { allowed_countries: { 0: "AU" } },
    shipping_options: { 0: { shipping_rate: SHIPPING_RATE[mode] } },
    phone_number_collection: { enabled: "true" },
    billing_address_collection: "auto",
    success_url: site + "/thanks.html?from=bag&session_id={CHECKOUT_SESSION_ID}",
    cancel_url: site + "/bag.html",
    metadata: { source: "jotay-bag", items: summary.join(", ").slice(0, 490) },
  };
  let r;
  try {
    r = await request("POST", "https://api.stripe.com/v1/checkout/sessions", {
      Authorization: "Bearer " + key,
      "Content-Type": "application/x-www-form-urlencoded",
    }, form(params));
  } catch (e) {
    return reply(502, { error: "We couldn't reach the payment page. Please try again." });
  }
  let session = {};
  try { session = JSON.parse(r.body); } catch (e) { /* ignore */ }
  if (r.status !== 200 || !session.url) {
    console.log("stripe error", r.status, session.error && session.error.code, session.error && session.error.message);
    return reply(502, { error: "We couldn't open the payment page. Please try again, or use Buy now on each piece." });
  }
  return reply(200, { url: session.url });
}

exports.main = main;
