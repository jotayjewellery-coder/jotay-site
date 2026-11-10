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

  document.querySelectorAll(".gallery").forEach(function (g) { mountGallery(g); });
  if (!targets.length) return;

  fetch("data/products.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      var byId = {};
      data.products.forEach(function (p) { byId[p.id] = p; });
      var bundleById = {};
      data.bundles.forEach(function (b) { bundleById[b.id] = b; });
      targets.forEach(function (el) {
        var kind = el.getAttribute("data-render");
        var limit = parseInt(el.getAttribute("data-limit") || "0", 10);
        if (kind === "picks") {
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
            setMeta(prod.name + " | JoTay", (prod.description || prod.name) + " Free Australia-wide shipping.", "https://jotay.com.au/" + productUrl(prod.id), "https://jotay.com.au/" + (prod.imageFallback || prod.image));
          } else if (bun) {
            el.innerHTML = bundlePageHtml(bun, byId);
            mountGallery(el);
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
