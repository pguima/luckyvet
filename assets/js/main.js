(function () {
  "use strict";

  /* ---------- Menu mobile ---------- */
  var toggle = document.querySelector("[data-menu-toggle]");
  var nav = document.getElementById("menu");
  var toggleIcon = toggle && toggle.querySelector("use");

  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    toggleIcon.setAttribute("href", open ? "#i-x" : "#i-menu");
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setMenu(!nav.classList.contains("is-open"));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) setMenu(false);
    });
  }

  /* ---------- Sombra do cabeçalho ao rolar ---------- */
  var header = document.querySelector("[data-header]");
  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Link ativo no menu ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]:not(.btn)'));
  if ("IntersectionObserver" in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.classList.toggle("is-active", link.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navLinks.forEach(function (link) {
      var section = document.querySelector(link.getAttribute("href"));
      if (section) sectionObserver.observe(section);
    });
  }

  /* ---------- Animações de entrada ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    reveals.forEach(function (el) {
      // Escalonamento sutil entre irmãos
      var siblings = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.classList.contains("reveal"); });
      var index = siblings.indexOf(el);
      if (index > 0) el.style.transitionDelay = Math.min(index * 70, 420) + "ms";
      revealObserver.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Aberto agora / horário de hoje ---------- */
  // Dia da semana (0 = domingo) -> [abre, fecha] em minutos
  var HOURS = {
    0: null,
    1: [13 * 60, 19 * 60],
    2: [9 * 60, 19 * 60],
    3: [9 * 60, 19 * 60],
    4: [9 * 60, 17 * 60],
    5: [9 * 60, 17 * 60],
    6: [9 * 60, 17 * 60]
  };
  var DAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  function nowInSaoPaulo() {
    try {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false
      }).formatToParts(new Date());
      var map = {};
      parts.forEach(function (p) { map[p.type] = p.value; });
      var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { day: days[map.weekday], minutes: (parseInt(map.hour, 10) % 24) * 60 + parseInt(map.minute, 10) };
    } catch (e) {
      var d = new Date();
      return { day: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() };
    }
  }

  function fmt(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return h + "h" + (m ? String(m).padStart(2, "0") : "");
  }

  function nextOpening(day, minutes) {
    for (var i = 0; i < 7; i++) {
      var d = (day + i) % 7;
      var slot = HOURS[d];
      if (!slot) continue;
      if (i === 0 && minutes >= slot[0]) continue;
      var when = i === 0 ? "hoje" : i === 1 ? "amanhã" : DAY_NAMES[d];
      return "Abre " + when + " às " + fmt(slot[0]);
    }
    return "";
  }

  function updateStatus() {
    var now = nowInSaoPaulo();
    var slot = HOURS[now.day];
    var open = !!slot && now.minutes >= slot[0] && now.minutes < slot[1];

    var title = document.querySelector("[data-open-title]");
    var sub = document.querySelector("[data-open-sub]");
    var dot = document.querySelector("[data-dot]");
    var topStatus = document.querySelector("[data-status]");
    var topText = document.querySelector("[data-status-text]");

    if (title && sub && dot) {
      title.textContent = open ? "Aberto agora" : "Fechado no momento";
      sub.textContent = open ? "Atendemos hoje até as " + fmt(slot[1]) : nextOpening(now.day, now.minutes);
      dot.classList.toggle("is-open", open);
      dot.classList.toggle("is-closed", !open);
    }

    if (open) {
      topText.textContent = "Aberto agora · até " + fmt(slot[1]);
    } else {
      var next = nextOpening(now.day, now.minutes);
      topText.textContent = "Fechado agora · " + next.charAt(0).toLowerCase() + next.slice(1);
    }
    topStatus.classList.toggle("is-open", open);

    document.querySelectorAll("[data-hours] tr").forEach(function (row) {
      var days = row.getAttribute("data-days").split(" ").map(Number);
      row.classList.toggle("is-today", days.indexOf(now.day) !== -1);
    });
  }

  updateStatus();
  setInterval(updateStatus, 60 * 1000);

  /* ---------- Ano no rodapé ---------- */
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
