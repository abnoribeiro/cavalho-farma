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
    zoomControl: true,
    zoomSnap: 0.25
  });

  map.createPane("fora").style.zIndex = 380;
  map.createPane("entrega").style.zIndex = 400;
  map.getPane("entrega").style.opacity = "0.8";
  map.createPane("rotulos").style.zIndex = 450;
  map.getPane("rotulos").style.pointerEvents = "none";

  var ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/";
  var tileOptions = { maxNativeZoom: 16, maxZoom: 19 };

  L.tileLayer(ESRI + "World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", L.extend({
    attribution: 'Mapa &copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Bairros: Prefeitura de Fortaleza'
  }, tileOptions)).addTo(map);

  L.tileLayer(ESRI + "World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}", L.extend({
    pane: "rotulos"
  }, tileOptions)).addTo(map);

  bindTwoFinger(map);

  var pin = L.marker([STORE.lat, STORE.lng], {
    icon: L.icon({
      iconUrl: new URL("../assets/localizacao.png", window.location.href).href,
      className: "store-pin-img",
      iconSize: [34, 44],
      iconAnchor: [17, 44],
      popupAnchor: [0, -40]
    }),
    zIndexOffset: 800,
    title: "Carvalho Farma",
    alt: "Carvalho Farma",
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
      var isDelivery = function (feature) { return feature.properties.entrega; };

      L.geoJSON(data, {
        pane: "fora",
        interactive: false,
        filter: function (feature) { return !isDelivery(feature); },
        style: styleOf,
        onEachFeature: function (feature) { otherNames.push(feature.properties.nome); }
      }).addTo(map);

      // The fill must stay opaque: it hides the shared inner edges of this
      // outline, leaving only the outer contour. Translucency comes from the pane.
      L.geoJSON(data, {
        pane: "entrega",
        interactive: false,
        filter: isDelivery,
        style: { color: "#003A70", weight: 5, fill: false, lineJoin: "round" }
      }).addTo(map);

      var delivery = L.geoJSON(data, {
        pane: "entrega",
        filter: isDelivery,
        style: styleOf,
        onEachFeature: function (feature, layer) {
          var nome = feature.properties.nome;
          byName.set(normalize(nome), layer);
          layer.on("click", function () { selectName(nome); });
          layer.on("mouseover", function () {
            if (selected === layer) return;
            layer.setStyle(paint(true, true));
            layer.bringToFront();
          });
          layer.on("mouseout", function () {
            if (selected === layer) return;
            layer.setStyle(styleOf(feature));
            if (selected) selected.bringToFront();
          });
        }
      }).addTo(map);

      if (delivery.getLayers().length) {
        map.fitBounds(delivery.getBounds(), { padding: [18, 18] });
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
        color: hover ? "#003A70" : "#E0A400",
        weight: hover ? 2.5 : 0.8,
        fillColor: hover ? "#FFB300" : "#FFC107",
        fillOpacity: 1
      };
    }
    return {
      color: "#b9b1a1",
      weight: 0.6,
      fillColor: "#efe9dc",
      fillOpacity: 0.4
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
