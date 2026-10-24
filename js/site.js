(function () {
  var banner = document.getElementById("cookie");
  if (!banner) return;

  var key = "cf-consent";
  var saved = null;
  try {
    saved = localStorage.getItem(key);
  } catch (error) {
    saved = null;
  }

  if (!saved) {
    banner.hidden = false;
    document.body.classList.add("has-cookie");
  }

  var accept = document.getElementById("cookie-aceitar");
  var reject = document.getElementById("cookie-recusar");
  if (accept) accept.addEventListener("click", function () { choose("accept"); });
  if (reject) reject.addEventListener("click", function () { choose("reject"); });

  function choose(value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      /* a escolha ainda some desta visita */
    }
    if (value === "accept") {
      document.cookie = "cf_consent=accept; Max-Age=15552000; Path=/; SameSite=Lax";
    }
    banner.hidden = true;
    document.body.classList.remove("has-cookie");
  }
})();
