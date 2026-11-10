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
  if (!targets.length) return;

  var PREVIEW = /[?&]preview=1/.test(location.search);
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n) { return "A$" + (Number.isInteger(n) ? n : n.toFixed(2)); }
  function isLive(link) { return /^https:\/\/(buy\.stripe\.com|checkout\.stripe\.com)\//.test(link || ""); }
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
  function productCard(p, eager) {
    var badge = p.stock <= 0 ? '<span class="badge out">Sold out</span>' : "";
    return '<article class="card" data-cat="' + esc(p.category) + '">' +
      '<div class="img">' + picture(p, eager) + badge + "</div>" +
      '<div class="body"><h3>' + esc(p.name) + "</h3>" +
      '<p class="finish">' + esc(p.finish) + " · stainless steel</p>" +
      '<p class="desc">' + esc(p.description) + "</p>" +
      '<p class="details">' + esc(p.details) + "</p>" +
      '<div class="row"><span class="price">' + money(p.price) + "</span>" + stockText(p.stock) + "</div>" +
      buyBtn(p, p.stock) + "</div></article>";
  }
  function bundleCard(b, byId) {
    var items = b.items.map(function (id) { return byId[id]; }).filter(Boolean);
    var stock = items.length ? Math.min.apply(null, items.map(function (i) { return i.stock; })) : 0;
    var worth = items.reduce(function (s, i) { return s + i.price; }, 0);
    var badge = stock <= 0 ? '<span class="badge out">Sold out</span>' : b.christmas ? '<span class="badge sky">Christmas gift</span>' : "";
    return '<article class="card bundle">' +
      '<div class="img">' + picture(b) + badge + "</div>" +
      '<div class="body"><h3>' + esc(b.name) + "</h3>" +
      '<p class="desc">' + esc(b.description) + "</p>" +
      '<ul class="bundle-items">' + items.map(function (i) { return "<li>" + esc(i.name) + "</li>"; }).join("") + "</ul>" +
      '<div class="row"><span class="price">' + money(b.price) + (worth > b.price ? " <s>" + money(worth) + "</s>" : "") + "</span>" + stockText(stock) + "</div>" +
      buyBtn(b, stock) + "</div></article>";
  }

  fetch("data/products.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      var byId = {};
      data.products.forEach(function (p) { byId[p.id] = p; });
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
        }
      });
    })
    .catch(function () {
      targets.forEach(function (el) {
        el.innerHTML = '<p class="note">Sorry, the shop didn\'t load. Please refresh, or email us at <a href="mailto:hello@jotay.com.au">hello@jotay.com.au</a>.</p>';
      });
    });
})();
