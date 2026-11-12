/* JoTay shop: renders products from data/products.json. No build step. */
(function () {
  "use strict";
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  var targets = document.querySelectorAll("[data-render]");

  var PREVIEW = /[?&]preview=1/.test(location.search);
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n) { return "A$" + (Number.isInteger(n) ? n : n.toFixed(2)); }
  /* ---- bag (stored in this browser only) ---- */
  var BAG_KEY = "jotay-bag";
  function bagRead() {
    try {
      var b = JSON.parse(localStorage.getItem(BAG_KEY) || "{}");
      return b && typeof b === "object" && !Array.isArray(b) ? b : {};
    } catch (e) { return {}; }
  }
  function bagWrite(b) {
    try { localStorage.setItem(BAG_KEY, JSON.stringify(b)); } catch (e) { /* private mode */ }
    bagBadge();
  }
  function bagCount(b) {
    b = b || bagRead();
    return Object.keys(b).reduce(function (n, k) { return n + (parseInt(b[k], 10) || 0); }, 0);
  }
  function bagBadge() {
    var n = bagCount();
    document.querySelectorAll(".bag-count").forEach(function (el) { el.textContent = n; el.hidden = n === 0; });
    document.querySelectorAll(".bag-link").forEach(function (el) { el.setAttribute("aria-label", "Your bag, " + n + (n === 1 ? " item" : " items")); });
  }
  (function addBagLink() {
    var wrap = document.querySelector(".site-header .wrap");
    if (!wrap || wrap.querySelector(".bag-link")) return;
    var a = document.createElement("a");
    a.className = "bag-link";
    a.href = "/bag.html";
    a.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M7 7V6a5 5 0 0 1 10 0v1h2.2a1 1 0 0 1 1 .9l1.2 13a1 1 0 0 1-1 1.1H3.6a1 1 0 0 1-1-1.1l1.2-13a1 1 0 0 1 1-.9H7zm2 0h6V6a3 3 0 0 0-6 0v1zm-2 3a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm8 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0z"/></svg><span class="bag-word">Bag</span><span class="bag-count" hidden>0</span>';
    var toggle = wrap.querySelector(".nav-toggle");
    wrap.insertBefore(a, toggle || null);
    bagBadge();
  })();
  window.addEventListener("storage", function (e) { if (e.key === BAG_KEY) bagBadge(); });
  if (/[?&]from=bag(&|$)/.test(location.search)) bagWrite({});

  function isLive(link) { return /^https:\/\/(buy\.stripe\.com|checkout\.stripe\.com)\//.test(link || ""); }
  function productUrl(id) { return "/p/" + encodeURIComponent(id) + ".html"; }
  function stockText(n) {
    if (n <= 0) return '<span class="stock low">Sold out</span>';
    return "";
  }
  function buyBtn(item, stock) {
    if (stock <= 0) return '<span class="btn btn-primary" aria-disabled="true">Sold out</span>';
    if (!isLive(item.stripeLink) && PREVIEW)
      return '<a class="btn btn-primary" href="#" onclick="alert(\'Preview only: paste the Stripe Payment Link for this item into data/products.json\');return false;">Buy now</a>';
    if (!isLive(item.stripeLink))
      return '<span class="btn btn-primary" aria-disabled="true" title="Checkout opens soon">Coming soon</span>';
    return '<a class="btn btn-primary" href="' + esc(item.stripeLink) + '" rel="noopener">Buy now<span class="sr-only"> ' + esc(item.name) + "</span></a>";
  }
  function picture(item, eager) {
    return '<picture><source srcset="' + esc(item.image) + '" type="image/webp"><img src="' + esc(item.imageFallback) +
      '" alt="' + esc(item.alt || item.name) + '" width="800" height="800"' + (eager ? "" : ' loading="lazy"') + ' decoding="async"></picture>';
  }
  function galleryList(item) {
    if (item.gallery && item.gallery.length) return item.gallery;
    return [{ image: item.image, imageFallback: item.imageFallback, alt: item.alt || item.name }];
  }
  function productCard(p, eager) {
    var badge = p.stock <= 0 ? '<span class="badge out">Sold out</span>' : "";
    var href = productUrl(p.id);
    return '<article class="card" data-cat="' + esc(p.category) + '">' +
      '<div class="img"><a href="' + href + '">' + picture(p, eager) + "</a>" + badge + "</div>" +
      '<div class="body"><h3><a href="' + href + '">' + esc(p.name) + "</a></h3>" +
      '<div class="row"><span class="price">' + money(p.price) + "</span>" + stockText(p.stock) + "</div>" +
      '<a class="btn btn-ghost" href="' + href + '">View<span class="sr-only"> ' + esc(p.name) + "</span></a></div></article>";
  }
  function bundleCard(b, byId) {
    var items = b.items.map(function (id) { return byId[id]; }).filter(Boolean);
    var stock = items.length ? Math.min.apply(null, items.map(function (i) { return i.stock; })) : 0;
    var worth = items.reduce(function (s, i) { return s + i.price; }, 0);
    var badge = stock <= 0 ? '<span class="badge out">Sold out</span>' : b.christmas ? '<span class="badge sky">Christmas gift</span>' : "";
    var href = productUrl(b.id);
    return '<article class="card bundle">' +
      '<div class="img"><a href="' + href + '">' + picture(b) + "</a>" + badge + "</div>" +
      '<div class="body"><h3><a href="' + href + '">' + esc(b.name) + "</a></h3>" +
      '<ul class="bundle-items">' + items.map(function (i) { return "<li>" + esc(i.name) + "</li>"; }).join("") + "</ul>" +
      '<div class="row"><span class="price">' + money(b.price) + (worth > b.price ? " <s>" + money(worth) + "</s>" : "") + "</span>" + stockText(stock) + "</div>" +
      '<a class="btn btn-ghost" href="' + href + '">View<span class="sr-only"> ' + esc(b.name) + "</span></a></div></article>";
  }
  function setMeta(title, desc, url, image) {
    document.title = title;
    function set(sel, attr, val) {
      var el = document.querySelector(sel);
      if (el) el.setAttribute(attr, val);
    }
    set('meta[name="description"]', "content", desc);
    set('meta[property="og:title"]', "content", title);
    set('meta[property="og:description"]', "content", desc);
    set('meta[property="og:url"]', "content", url);
    var canon = document.querySelector('link[rel="canonical"]');
    if (canon) canon.setAttribute("href", url);
    if (image) set('meta[property="og:image"]', "content", image);
  }
  function mountGallery(root) {
    var track = root.querySelector(".gallery-track");
    var thumbs = root.querySelectorAll(".gallery-thumbs button");
    if (!track || thumbs.length < 2) return;
    function currentIndex() {
      var w = track.clientWidth || 1;
      return Math.max(0, Math.min(thumbs.length - 1, Math.round(track.scrollLeft / w)));
    }
    function setActive(i) {
      thumbs.forEach(function (b, j) { b.setAttribute("aria-current", j === i ? "true" : "false"); });
    }
    setActive(0);
    track.addEventListener("scroll", function () { setActive(currentIndex()); }, { passive: true });
    thumbs.forEach(function (btn, i) {
      btn.addEventListener("click", function () {
        var w = track.clientWidth;
        track.scrollTo({ left: i * w, behavior: "smooth" });
        setActive(i);
      });
    });
  }
  function galleryHtml(item, name) {
    var imgs = galleryList(item);
    var slides = imgs.map(function (im, i) {
      return '<div class="gallery-slide" role="group" aria-label="Photo ' + (i + 1) + " of " + imgs.length + '">' +
        picture({ image: im.image, imageFallback: im.imageFallback, alt: im.alt || name }, i === 0) +
        "</div>";
    }).join("");
    var thumbs = "";
    if (imgs.length > 1) {
      thumbs = '<div class="gallery-thumbs" role="tablist" aria-label="Photos of ' + esc(name) + '">' +
        imgs.map(function (im, i) {
          return '<button type="button" aria-label="Photo ' + (i + 1) + '" aria-current="' + (i === 0 ? "true" : "false") + '">' +
            '<img src="' + esc(im.imageFallback) + '" alt="" width="72" height="72"></button>';
        }).join("") + "</div>";
    }
    return '<div class="gallery"><div class="gallery-track" tabindex="0" aria-label="Photos of ' + esc(name) + '">' + slides + "</div>" + thumbs + "</div>";
  }
  function productPageHtml(p) {
    var back = p.category ? "shop.html#" + encodeURIComponent(p.category) : "shop.html";
    return '<p class="crumb"><a href="' + back + '">\u2190 Shop</a></p>' +
      '<div class="product-layout">' +
      galleryHtml(p, p.name) +
      '<div class="product-info">' +
      "<h1>" + esc(p.name) + "</h1>" +
      '<p class="finish">' + esc(p.finish) + " \u00b7 stainless steel</p>" +
      "<p>" + esc(p.description) + "</p>" +
      '<p class="details">' + esc(p.details) + "</p>" +
      '<div class="row"><span class="price">' + money(p.price) + "</span>" + stockText(p.stock) + "</div>" +
      buyBtn(p, p.stock) +
      '<p class="ship-note">Free Australia-wide shipping with Australia Post.</p>' +
      "</div></div>";
  }
  function bundlePageHtml(b, byId) {
    var items = b.items.map(function (id) { return byId[id]; }).filter(Boolean);
    var stock = items.length ? Math.min.apply(null, items.map(function (i) { return i.stock; })) : 0;
    var worth = items.reduce(function (s, i) { return s + i.price; }, 0);
    var list = '<ul class="bundle-items product-items">' + items.map(function (i) {
      return '<li><a href="' + productUrl(i.id) + '">' + esc(i.name) + "</a></li>";
    }).join("") + "</ul>";
    return '<p class="crumb"><a href="bundles.html">\u2190 Gift bundles</a></p>' +
      '<div class="product-layout">' +
      galleryHtml(b, b.name) +
      '<div class="product-info">' +
      "<h1>" + esc(b.name) + "</h1>" +
      "<p>" + esc(b.description) + "</p>" +
      list +
      '<div class="row"><span class="price">' + money(b.price) + (worth > b.price ? " <s>" + money(worth) + "</s>" : "") + "</span>" + stockText(stock) + "</div>" +
      buyBtn(b, stock) +
      '<p class="ship-note">Free Australia-wide shipping with Australia Post.</p>' +
      "</div></div>";
  }

  function itemStock(item, byId) {
    if (item.items) {
      var ps = item.items.map(function (id) { return byId[id]; }).filter(Boolean);
      return ps.length ? Math.min.apply(null, ps.map(function (i) { return i.stock; })) : 0;
    }
    return item.stock;
  }
  function addBagButton(root, item, byId) {
    var info = root.querySelector(".product-info");
    if (!info || info.querySelector(".add-bag") || !item.stripePrice) return;
    var stock = itemStock(item, byId);
    if (stock <= 0) return;
    var buy = info.querySelector(".btn-primary");
    var box = document.createElement("div");
    box.className = "buy-row";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sky add-bag";
    btn.innerHTML = "Add to bag<span class=\"sr-only\"> " + esc(item.name) + "</span>";
    var msg = document.createElement("p");
    msg.className = "bag-msg";
    msg.setAttribute("role", "status");
    btn.addEventListener("click", function () {
      var b = bagRead();
      var q = (parseInt(b[item.id], 10) || 0);
      if (q >= stock) {
        msg.innerHTML = "You've got all " + stock + " we have in your bag. <a href=\"/bag.html\">View bag</a>";
        return;
      }
      b[item.id] = q + 1;
      bagWrite(b);
      msg.innerHTML = "Added to your bag \uD83D\uDC97 <a href=\"/bag.html\">View bag &amp; checkout</a>";
    });
    if (buy && buy.parentNode === info) {
      info.insertBefore(box, buy);
      box.appendChild(buy);
    } else {
      info.appendChild(box);
    }
    box.appendChild(btn);
    box.insertAdjacentElement("afterend", msg);
  }
  function bagPageHtml(lines, total) {
    if (!lines.length) {
      return '<div class="bag-empty"><p>Your bag is empty.</p><p><a class="btn btn-primary" href="/shop.html">Shop jewellery</a> <a class="btn btn-ghost" href="/bundles.html">Gift bundles</a></p></div>';
    }
    return '<ul class="bag-lines">' + lines.map(function (l) {
      var it = l.item;
      return '<li class="bag-line" data-id="' + esc(it.id) + '">' +
        '<a class="bag-img" href="' + productUrl(it.id) + '"><img src="/' + esc(it.imageFallback || it.image) + '" alt="" width="80" height="80" loading="lazy"></a>' +
        '<div class="bag-info"><a class="bag-name" href="' + productUrl(it.id) + '">' + esc(it.name) + '</a>' +
        '<span class="bag-each">' + money(it.price) + ' each</span>' +
        (l.note ? '<span class="stock low">' + esc(l.note) + "</span>" : "") + "</div>" +
        '<div class="qty" role="group" aria-label="Quantity of ' + esc(it.name) + '">' +
        '<button type="button" data-act="dec" aria-label="One less ' + esc(it.name) + '">\u2212</button>' +
        '<span aria-live="polite">' + l.qty + "</span>" +
        '<button type="button" data-act="inc" aria-label="One more ' + esc(it.name) + '"' + (l.qty >= l.stock ? " disabled" : "") + ">+</button></div>" +
        '<span class="bag-sub">' + money(it.price * l.qty) + "</span>" +
        '<button type="button" class="bag-remove" data-act="remove">Remove<span class="sr-only"> ' + esc(it.name) + "</span></button>" +
        "</li>";
    }).join("") + "</ul>" +
      '<div class="bag-total"><div class="row"><span>Shipping</span><span>Free, Australia Post</span></div>' +
      '<div class="row total"><span>Total</span><span class="price">' + money(total) + " AUD</span></div>" +
      '<button type="button" class="btn btn-primary bag-checkout">Checkout</button>' +
      '<p class="bag-error" role="alert"></p>' +
      '<p class="small-note">You\'ll pay securely with Stripe. All your pieces come in one parcel.</p></div>';
  }
  function mountBag(el, byId, bundleById) {
    function render() {
      var b = bagRead(), clean = {}, lines = [], total = 0;
      Object.keys(b).forEach(function (id) {
        var it = byId[id] || bundleById[id];
        var q = parseInt(b[id], 10) || 0;
        if (!it || !it.stripePrice || q < 1) return;
        var stock = itemStock(it, byId);
        if (stock <= 0) return;
        var note = "";
        if (q > stock) { q = stock; note = "Only " + stock + " left, so we've changed the quantity"; }
        clean[id] = q;
        lines.push({ item: it, qty: q, stock: stock, note: note });
        total += it.price * q;
      });
      if (JSON.stringify(clean) !== JSON.stringify(b)) bagWrite(clean);
      el.innerHTML = bagPageHtml(lines, total);
    }
    el.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      if (btn.classList.contains("bag-checkout")) return checkout(btn);
      var line = btn.closest(".bag-line");
      if (!line) return;
      var id = line.getAttribute("data-id"), b = bagRead(), act = btn.getAttribute("data-act");
      var q = parseInt(b[id], 10) || 0;
      if (act === "inc") b[id] = q + 1;
      else if (act === "dec") b[id] = q - 1;
      if (act === "remove" || b[id] < 1) delete b[id];
      bagWrite(b);
      render();
      var again = el.querySelector('.bag-line[data-id="' + id + '"] [data-act="' + act + '"]');
      if (again && !again.disabled) again.focus();
    });
    function checkout(btn) {
      var b = bagRead(), err = el.querySelector(".bag-error");
      var items = Object.keys(b).map(function (id) {
        var it = byId[id] || bundleById[id];
        return { price: it.stripePrice, quantity: b[id] };
      });
      btn.disabled = true;
      btn.textContent = "Opening secure checkout\u2026";
      err.textContent = "";
      fetch("/api/cart/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: items }) })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (d) {
          if (d && d.url && /^https:\/\/checkout\.stripe\.com\//.test(d.url)) { location.href = d.url; return; }
          throw new Error((d && d.error) || "Sorry, checkout didn't open. Please try again.");
        })
        .catch(function (e) {
          err.textContent = e.message && !/fetch|network/i.test(e.message) ? e.message : "Sorry, checkout didn't open. Please try again.";
          btn.disabled = false;
          btn.textContent = "Checkout";
        });
    }
    render();
    window.addEventListener("storage", function (e) { if (e.key === BAG_KEY) render(); });
    window.addEventListener("pageshow", function (e) { if (e.persisted) render(); });
  }

  document.querySelectorAll(".gallery").forEach(function (g) { mountGallery(g); });
  var pageId = (location.pathname.match(/\/p\/([a-z0-9-]+)\.html$/) || [])[1] || "";
  if (!targets.length && !pageId) return;

  fetch("/data/products.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      var byId = {};
      data.products.forEach(function (p) { byId[p.id] = p; });
      var bundleById = {};
      data.bundles.forEach(function (b) { bundleById[b.id] = b; });
      if (pageId && (byId[pageId] || bundleById[pageId])) addBagButton(document, byId[pageId] || bundleById[pageId], byId);
      targets.forEach(function (el) {
        var kind = el.getAttribute("data-render");
        var limit = parseInt(el.getAttribute("data-limit") || "0", 10);
        if (kind === "bag") {
          mountBag(el, byId, bundleById);
        } else if (kind === "picks") {
          var picks = data.products.filter(function (p) { return p.pick && p.stock > 0; });
          if (limit) picks = picks.slice(0, limit);
          el.innerHTML = picks.map(function (p, i) { return productCard(p, i < 2); }).join("");
        } else if (kind === "bundles") {
          var bs = data.bundles;
          if (limit) bs = bs.slice(0, limit);
          el.innerHTML = bs.map(function (b) { return bundleCard(b, byId); }).join("");
        } else if (kind === "shop") {
          var cats = data.categories;
          var filters = document.getElementById("filters");
          var html = "";
          cats.forEach(function (c) {
            var list = data.products.filter(function (p) { return p.category === c.id; });
            if (!list.length) return;
            list.sort(function (a, b) { return (b.stock > 0) - (a.stock > 0); });
            html += '<section class="cat" data-cat="' + c.id + '" aria-labelledby="h-' + c.id + '"><h2 id="h-' + c.id + '">' + esc(c.name) + "</h2>" +
              '<div class="grid">' + list.map(function (p, i) { return productCard(p, i < 2 && c === cats[0]); }).join("") + "</div></section>";
          });
          el.innerHTML = html;
          if (filters) {
            filters.innerHTML = '<li><button type="button" aria-pressed="true" data-f="all">All</button></li>' +
              cats.map(function (c) { return '<li><button type="button" aria-pressed="false" data-f="' + c.id + '">' + esc(c.name) + "</button></li>"; }).join("");
            var apply = function (f) {
              filters.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-f") === f ? "true" : "false"); });
              el.querySelectorAll(".cat").forEach(function (s) { s.hidden = !(f === "all" || s.getAttribute("data-cat") === f); });
            };
            filters.addEventListener("click", function (e) {
              var b = e.target.closest("button"); if (!b) return;
              var f = b.getAttribute("data-f"); apply(f);
              history.replaceState(null, "", f === "all" ? location.pathname : "#" + f);
            });
            var h = location.hash.slice(1);
            if (h && cats.some(function (c) { return c.id === h; })) apply(h);
          }
        } else if (kind === "product") {
          var id = new URLSearchParams(location.search).get("id") || "";
          var prod = byId[id];
          var bun = bundleById[id];
          if (prod) {
            el.innerHTML = productPageHtml(prod);
            mountGallery(el);
            addBagButton(el, prod, byId);
            setMeta(prod.name + " | JoTay", (prod.description || prod.name) + " Free Australia-wide shipping.", "https://jotay.com.au/" + productUrl(prod.id), "https://jotay.com.au/" + (prod.imageFallback || prod.image));
          } else if (bun) {
            el.innerHTML = bundlePageHtml(bun, byId);
            mountGallery(el);
            addBagButton(el, bun, byId);
            setMeta(bun.name + " | JoTay", (bun.description || bun.name) + " Free Australia-wide shipping.", "https://jotay.com.au/" + productUrl(bun.id), "https://jotay.com.au/" + (bun.imageFallback || bun.image));
          } else {
            el.innerHTML = '<p class="crumb"><a href="shop.html">\u2190 Shop</a></p><h1>We couldn\'t find that piece</h1><p>It may have been sold or the link is out of date.</p><p><a class="btn btn-primary" href="shop.html">Back to the shop</a></p>';
            document.title = "Piece not found | JoTay";
          }
        }
      });
    })
    .catch(function () {
      targets.forEach(function (el) {
        el.innerHTML = '<p class="note">Sorry, the shop didn\'t load. Please refresh, or email us at <a href="mailto:jotayjewellery@gmail.com">jotayjewellery@gmail.com</a>.</p>';
      });
    });
})();
