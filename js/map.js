(function () {
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

})();
