// Shared behaviour for every page: mobile menu, magazine cover fallback, footer year.
(function () {
  // Mobile menu
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  // If a cover image is missing, show the designed placeholder instead.
  document.querySelectorAll(".cover img").forEach(function (img) {
    var fallback = function () { img.closest(".cover").classList.add("no-img"); };
    if (img.complete && img.naturalWidth === 0) fallback();
    img.addEventListener("error", fallback);
  });

  // Footer year
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
