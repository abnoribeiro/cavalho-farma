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

  map.setView([STORE.lat, STORE.lng], 12);

  var ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/";
  var tileOptions = { maxNativeZoom: 16, maxZoom: 19 };

  L.tileLayer(ESRI + "World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", L.extend({
    attribution: 'Mapa &copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }, tileOptions)).addTo(map);

  var radius = L.circle([STORE.lat, STORE.lng], {
    radius: 5000,
    color: "#003A70",
    weight: 2,
    fillColor: "#FFC107",
    fillOpacity: 0.38,
    interactive: false
  }).addTo(map);
  map.fitBounds(radius.getBounds(), { padding: [24, 24] });

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

  var otherNames = [];

  fetch(new URL("../data/bairros.geojson", window.location.href))
    .then(function (response) {
      if (!response.ok) throw new Error("mapa");
      return response.json();
    })
    .then(function (data) {
      data.features.forEach(function (feature) {
        if (!feature.properties.entrega) otherNames.push(feature.properties.nome);
      });
    })
    .catch(function () {});

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      selectName(button.getAttribute("data-bairro"), true);
    });
  });

  if (input) input.addEventListener("input", filterList);

  function selectName(nome, scroll) {
    buttons.forEach(function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-bairro") === nome ? "true" : "false");
    });

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
