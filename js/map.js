(function () {
  var mapEl = document.getElementById("mapa");
  if (!mapEl || typeof L === "undefined") return;

  var STORE = { lat: -3.782489, lng: -38.5775907 };
  var ROUTE = "https://www.google.com/maps/dir/?api=1&destination=" +
    encodeURIComponent("Av. Gen. Osório de Paiva, 1762, Parangaba, Fortaleza - CE, 60720-015");

  var buttons = Array.prototype.slice.call(document.querySelectorAll("[data-bairro]"));
  var input = document.getElementById("bairro-busca");
  var form = document.getElementById("busca-bairro");
  var emptyEl = document.getElementById("bairro-vazio");
  var foraEl = document.getElementById("bairro-fora");
  var statusEl = document.getElementById("bairro-status");
  var picked = document.getElementById("entrega-escolhida");
  var pickedName = document.getElementById("picked-name");
  var pickedWa = document.getElementById("picked-wa");

  if (form) form.addEventListener("submit", function (event) { event.preventDefault(); });

  var map = L.map(mapEl, {
    scrollWheelZoom: false,
    zoomControl: true
  });

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Bairros: Prefeitura de Fortaleza',
    maxZoom: 19
  }).addTo(map);

  bindTwoFinger(map);

  var pin = L.marker([STORE.lat, STORE.lng], {
    icon: L.divIcon({
      className: "store-pin-wrap",
      html: '<div class="store-pin"></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 26],
      popupAnchor: [0, -24]
    }),
    zIndexOffset: 800,
    title: "Carvalho Farma",
    keyboard: true
  }).addTo(map);

  pin.bindPopup(
    '<p class="popup-title">Carvalho Farma</p>' +
    '<p>Av. Gen. Osório de Paiva, 1762 – Parangaba</p>' +
    '<a class="btn btn-secondary" href="' + ROUTE + '" target="_blank" rel="noopener noreferrer">Traçar rota</a>',
    { className: "brand-popup", maxWidth: 260 }
  );

  var byName = new Map();
  var otherNames = [];
  var selected = null;

  fetch(new URL("../data/bairros.geojson", window.location.href))
    .then(function (response) {
      if (!response.ok) throw new Error("mapa");
      return response.json();
    })
    .then(function (data) {
      var delivery = [];
      L.geoJSON(data, {
        style: styleOf,
        onEachFeature: function (feature, layer) {
          var nome = feature.properties.nome;
          byName.set(normalize(nome), layer);
          if (feature.properties.entrega) {
            delivery.push(layer);
            layer.on("click", function () { selectName(nome); });
            layer.on("mouseover", function () {
              if (selected !== layer) layer.setStyle(paint(true, true));
            });
            layer.on("mouseout", function () {
              if (selected !== layer) layer.setStyle(styleOf(feature));
            });
          } else {
            otherNames.push(nome);
          }
        }
      }).addTo(map);

      if (delivery.length) {
        map.fitBounds(L.featureGroup(delivery).getBounds(), { padding: [18, 18] });
      }
      pin.setZIndexOffset(1000);
    })
    .catch(function () {
      mapEl.insertAdjacentHTML("afterend", '<p class="map-error">O mapa não carregou. A lista de bairros abaixo continua valendo.</p>');
    });

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      selectName(button.getAttribute("data-bairro"), true);
    });
  });

  if (input) input.addEventListener("input", filterList);

  function styleOf(feature) {
    return paint(feature.properties.entrega, false);
  }

  function paint(delivery, hover) {
    if (delivery) {
      return {
        color: "#003772",
        weight: hover ? 2.6 : 1.5,
        fillColor: "#FFC200",
        fillOpacity: hover ? 0.92 : 0.72
      };
    }
    return {
      color: "#c8c1b3",
      weight: 0.7,
      fillColor: "#e7e2d6",
      fillOpacity: 0.92
    };
  }

  function selectName(nome, scroll) {
    buttons.forEach(function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-bairro") === nome ? "true" : "false");
    });

    if (selected && selected.feature) selected.setStyle(styleOf(selected.feature));

    var layer = byName.get(normalize(nome));
    var message = "Olá! Vim pelo site. Vocês entregam no meu bairro? (" + nome + ")";
    var href = "https://wa.me/5585997039895?text=" + encodeURIComponent(message);

    if (picked && pickedName && pickedWa) {
      picked.hidden = false;
      pickedName.textContent = nome;
      pickedWa.href = href;
    }
    if (statusEl) statusEl.textContent = nome + ". Entrega aqui.";

    if (scroll && picked) {
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      picked.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    }

    if (!layer) {
      selected = null;
      return;
    }

    selected = layer;
    layer.setStyle(paint(true, true));
    layer.bringToFront();
    pin.setZIndexOffset(1000);
    map.fitBounds(layer.getBounds(), { padding: [36, 36], maxZoom: 14 });
    layer.bindPopup(
      '<p class="popup-title">' + escapeHtml(nome) + '</p>' +
      '<p>Entrega aqui</p>' +
      '<a class="btn btn-primary" href="' + href + '" target="_blank" rel="noopener noreferrer">' +
      '<svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.04 2a10 10 0 0 0-8.7 14.9L2 22l5.3-1.2A10 10 0 1 0 12.04 2zm5.8 14.2c-.2.7-1.4 1.3-1.9 1.4-.5.1-1.1.1-1.8-.1-.4-.2-1-.3-1.7-.6-2.9-1.3-4.8-4.2-4.9-4.4-.2-.2-1.2-1.5-1.2-2.9s.7-2.1 1-2.4c.2-.3.6-.3.8-.3h.5c.2 0 .4 0 .6.5.3.6.8 2 .9 2.2.1.1.1.3 0 .5l-.3.5c-.1.2-.3.4-.4.5-.1.1-.3.3-.1.6.2.3.7 1.2 1.5 1.9 1 .9 1.9 1.2 2.2 1.3.3.1.4.1.6-.1.2-.2.7-.8.8-1 .2-.3.4-.2.6-.1.2.1 1.5.7 1.8.8.2.2.4.2.5.3.1.2.1.7-.2 1.4z"/></svg>' +
      'Peça pelo WhatsApp</a>',
      { className: "brand-popup", maxWidth: 260 }
    ).openPopup();
  }

  function filterList() {
    var query = normalize(input.value);
    var shown = 0;
    var exact = null;
    buttons.forEach(function (button) {
      var name = normalize(button.getAttribute("data-bairro"));
      var alias = normalize(button.getAttribute("data-alias") || "");
      var match = !query || (name + " " + alias).indexOf(query) !== -1;
      var item = button.closest("li");
      if (item) item.hidden = !match;
      if (match) {
        shown += 1;
        if (query && (name === query || alias === query)) exact = button;
      }
    });

    var details = document.getElementById("lista-bairros");
    if (exact) {
      if (details) details.open = false;
      if (!pickedName || pickedName.textContent !== exact.getAttribute("data-bairro")) {
        selectName(exact.getAttribute("data-bairro"), true);
      }
    } else if (details) {
      details.open = query.length > 0 && shown > 0;
    }

    var outside = false;
    if (query.length >= 3 && shown === 0) {
      outside = otherNames.some(function (nome) {
        return normalize(nome).indexOf(query) !== -1;
      });
    }
    if (emptyEl) emptyEl.hidden = shown !== 0 || outside || !query;
    if (foraEl) foraEl.hidden = !outside;
    if (statusEl) {
      if (!query) statusEl.textContent = "";
      else if (outside) statusEl.textContent = "Esse bairro não está na lista de entrega.";
      else if (exact) statusEl.textContent = exact.getAttribute("data-bairro") + ". Entrega aqui.";
      else if (shown === 1) statusEl.textContent = "1 bairro encontrado.";
      else statusEl.textContent = shown + " bairros encontrados.";
    }
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function bindTwoFinger(leafletMap) {
    var coarse = window.matchMedia("(pointer: coarse)").matches;
    if (!coarse) return;

    var el = leafletMap.getContainer();
    leafletMap.dragging.disable();
    leafletMap.touchZoom.disable();
    el.style.touchAction = "pan-y";

    var gesture = null;

    el.addEventListener("touchstart", function (event) {
      if (event.touches.length === 2) gesture = snapshot(event);
    }, { passive: true });

    el.addEventListener("touchmove", function (event) {
      if (event.touches.length < 2 || !gesture) return;
      event.preventDefault();
      var now = snapshot(event);
      leafletMap.panBy([now.x - gesture.x, now.y - gesture.y], { animate: false });
      var zoomDelta = Math.log2(now.dist / gesture.dist);
      if (Math.abs(zoomDelta) > 0.02) {
        var point = L.point(now.x, now.y);
        leafletMap.setZoomAround(leafletMap.containerPointToLatLng(point), leafletMap.getZoom() + zoomDelta);
      }
      gesture = snapshot(event);
    }, { passive: false });

    el.addEventListener("touchend", function (event) {
      if (event.touches.length < 2) gesture = null;
    });

    function snapshot(event) {
      var touches = event.touches;
      var rect = el.getBoundingClientRect();
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2 - rect.left,
        y: (touches[0].clientY + touches[1].clientY) / 2 - rect.top,
        dist: Math.hypot(
          touches[0].clientX - touches[1].clientX,
          touches[0].clientY - touches[1].clientY
        )
      };
    }
  }
})();
