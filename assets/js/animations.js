/*
 * Animações de entrada por seção (GSAP + ScrollTrigger).
 * Linguagem visual: tipografia cinética palavra a palavra, uma "faísca" brilhante
 * que voa com squash & stretch até a palavra-chave e desenha um marca-texto,
 * letras que se espalham e se reagrupam, cards entrando em 3D com easing elástico.
 */
(function () {
  "use strict";

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return; // fallback: .reveal de main.js
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  gsap.registerPlugin(ScrollTrigger);

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var rand = gsap.utils.random;

  var SPARK_LIGHT = { color: "#F47B20", mark: "rgba(244, 123, 32, .22)" };
  var SPARK_DARK = { color: "#FFB23F", mark: "rgba(255, 178, 63, .28)" };

  /* ---------- Divisão de texto ---------- */

  // Envolve cada palavra em .fx-w; dentro de <em>, cada letra também vira .fx-c.
  function splitText(el) {
    function walk(node, inEm) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement("span");
            w.className = inEm ? "fx-w fx-w--em" : "fx-w";
            if (inEm) {
              Array.from(part).forEach(function (ch) {
                var c = document.createElement("span");
                c.className = "fx-c";
                c.textContent = ch;
                w.appendChild(c);
              });
            } else {
              w.textContent = part;
            }
            frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && !/^(br|svg|img)$/i.test(child.tagName)) {
          var isEm = child.tagName === "EM";
          if (isEm) child.classList.add("fx-em");
          walk(child, inEm || isEm);
        }
      });
    }
    if (el.dataset.fxSplit) return el;
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    walk(el, false);
    el.dataset.fxSplit = "1";
    return el;
  }

  /* ---------- Faísca ---------- */

  var layer = document.createElement("div");
  layer.className = "fx-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);

  var FLOWER = (function () {
    var petals = "";
    for (var i = 0; i < 8; i++) petals += '<ellipse cx="0" cy="-6.4" rx="3" ry="5.2" transform="rotate(' + i * 45 + ')"/>';
    return '<svg viewBox="-12 -12 24 24" fill="currentColor">' + petals + '<circle r="3.6"/></svg>';
  })();

  function makeSpark() {
    var s = document.createElement("div");
    s.className = "fx-spark";
    s.innerHTML = '<div class="fx-spark__in">' + FLOWER + "</div>";
    layer.appendChild(s);
    return s;
  }

  function makeDot(size) {
    var d = document.createElement("div");
    d.className = "fx-dot";
    d.style.width = d.style.height = size + "px";
    d.style.margin = -size / 2 + "px 0 0 " + -size / 2 + "px";
    layer.appendChild(d);
    return d;
  }

  // A faísca entra em arco, estica na direção do voo, amassa ao pousar,
  // percorre a palavra desenhando o marca-texto e explode em partículas.
  function spark(em, theme, fromRight) {
    if (!em) return;
    var rects = em.getClientRects();
    if (!rects.length) return;
    var first = rects[0], last = rects[rects.length - 1];
    var sx = window.scrollX, sy = window.scrollY;
    var vw = document.documentElement.clientWidth;

    var landX = first.left + sx - 4;
    var landY = first.top + sy + first.height * 0.62;
    var endX = last.right + sx + 12;
    var endY = last.top + sy + last.height * 0.62;
    var originX = gsap.utils.clamp(sx + 20, sx + vw - 20, landX + (fromRight ? 320 : -320));
    var originY = landY - 220;
    var angle = Math.atan2(landY - originY, landX - originX) * 180 / Math.PI;

    var s = makeSpark();
    var inner = s.firstChild;
    s.style.color = theme.color;
    em.style.setProperty("--fx-mark", theme.mark);

    var trail = [makeDot(7), makeDot(5), makeDot(4)];
    trail.forEach(function (d) { d.style.color = theme.color; });

    var tl = gsap.timeline({
      onComplete: function () {
        s.remove();
        trail.forEach(function (d) { d.remove(); });
      }
    });

    // Voo em arco (x e y com eases diferentes)
    tl.set(s, { x: originX, y: originY, rotation: angle, opacity: 0 })
      .set(inner, { scaleX: 0.4, scaleY: 0.4 })
      .to(s, { opacity: 1, duration: 0.12 }, 0)
      .to(s, { x: landX, duration: 0.75, ease: "power1.inOut" }, 0)
      .to(s, { y: landY, duration: 0.75, ease: "power3.in" }, 0)
      .to(inner, { scaleX: 2.6, scaleY: 0.42, duration: 0.35, ease: "power2.out" }, 0)
      .to(inner, { scaleX: 0.6, scaleY: 1.5, duration: 0.12, ease: "power2.in" }, 0.63)
      .to(s, { rotation: 0, duration: 0.3, ease: "power2.out" }, 0.6)
      .to(inner, { scaleX: 1, scaleY: 1, duration: 0.7, ease: "elastic.out(1.1, .35)" }, 0.75);

    trail.forEach(function (d, i) {
      var delay = 0.05 + i * 0.05;
      tl.set(d, { x: originX, y: originY, opacity: 0 }, 0)
        .to(d, { opacity: 0.7 - i * 0.15, duration: 0.1 }, delay)
        .to(d, { x: landX, duration: 0.75, ease: "power1.inOut" }, delay)
        .to(d, { y: landY, duration: 0.75, ease: "power3.in" }, delay)
        .to(d, { opacity: 0, scale: 0.2, duration: 0.25 }, delay + 0.6);
    });

    // Percorre a palavra enquanto o marca-texto cresce atrás dela
    var sweep = Math.min(1.1, Math.max(0.55, (endX - landX) / 420));
    tl.to(s, { x: endX, y: endY, duration: sweep, ease: "power2.inOut" }, 0.95)
      .to(inner, { rotation: 360, duration: sweep, ease: "power2.inOut" }, 0.95)
      .to(em, { backgroundSize: "100% .34em", duration: sweep, ease: "power2.inOut" }, 0.95);

    // Estouro final
    var popAt = 0.95 + sweep + 0.1;
    tl.to(inner, { scale: 1.9, opacity: 0, duration: 0.4, ease: "power2.out" }, popAt);
    for (var i = 0; i < 8; i++) {
      var d = makeDot(rand(4, 7));
      d.style.color = theme.color;
      trail.push(d);
      var a = (i / 8) * Math.PI * 2 + rand(-0.3, 0.3);
      var dist = rand(26, 48);
      tl.set(d, { x: endX, y: endY, opacity: 1, scale: 1 }, popAt)
        .to(d, {
          x: endX + Math.cos(a) * dist,
          y: endY + Math.sin(a) * dist,
          scale: 0.2,
          opacity: 0,
          duration: rand(0.5, 0.8),
          ease: "expo.out"
        }, popAt);
    }
  }

  /* ---------- Blocos reutilizáveis ---------- */

  // Título: palavras saltam com blur e overshoot; letras da palavra-chave
  // se espalham e se reagrupam a partir do centro; a faísca finaliza.
  function kinetic(tl, h, at, theme, fromRight) {
    if (!h) return;
    splitText(h);
    var words = $$(".fx-w:not(.fx-w--em)", h);
    var chars = $$(".fx-c", h);
    var em = $(".fx-em", h);
    at = at === undefined ? 0 : at;

    tl.fromTo(words,
      { opacity: 0, yPercent: 80, scale: 0.5, rotation: function (i) { return i % 2 ? 7 : -7; }, filter: "blur(10px)", transformOrigin: "50% 100%" },
      { opacity: 1, yPercent: 0, scale: 1, rotation: 0, filter: "blur(0px)", duration: 0.8, ease: "back.out(2)", stagger: 0.06, clearProps: "filter,transform" },
      at);

    if (chars.length) {
      var mid = (chars.length - 1) / 2;
      tl.fromTo(chars,
        {
          opacity: 0,
          x: function (i) { return (i - mid) * 16; },
          y: function () { return rand(-34, 34); },
          rotation: function () { return rand(-45, 45); },
          scale: 0.3,
          filter: "blur(6px)"
        },
        { opacity: 1, x: 0, y: 0, rotation: 0, scale: 1, filter: "blur(0px)", duration: 1, ease: "expo.out", stagger: { each: 0.03, from: "center" }, clearProps: "filter,transform" },
        ">-0.55");
      tl.call(function () { spark(em, theme || SPARK_LIGHT, fromRight); }, null, ">-0.7");
    }
  }

  // Eyebrow: letras bem espaçadas que se recolhem.
  function eyebrow(tl, el, at) {
    if (!el) return;
    var ls = getComputedStyle(el).letterSpacing;
    tl.fromTo(el,
      { opacity: 0, letterSpacing: "0.8em", filter: "blur(4px)" },
      { opacity: 1, letterSpacing: ls === "normal" ? "0px" : ls, filter: "blur(0px)", duration: 1, ease: "expo.out", clearProps: "letterSpacing,filter" },
      at);
  }

  // Parágrafo: palavras sobem em onda rápida.
  function words(tl, el, at) {
    if (!el) return;
    splitText(el);
    tl.fromTo($$(".fx-w", el),
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", stagger: { amount: 0.6 }, clearProps: "transform" },
      at);
  }

  // Pop elástico.
  function pop(tl, els, at, extra) {
    els = [].concat(els).filter(Boolean);
    if (!els.length) return;
    lock(els);
    tl.fromTo(els,
      Object.assign({ opacity: 0, scale: 0.4, y: 24 }, extra && extra.from),
      Object.assign({ opacity: 1, scale: 1, y: 0, duration: 0.8, ease: "back.out(2.4)", stagger: 0.09, clearProps: "transform,opacity", onComplete: function () { unlock(els); } }, extra && extra.to),
      at);
  }

  // Ícone: traço se desenha.
  function draw(tl, icons, at) {
    icons = [].concat(icons).filter(Boolean);
    if (!icons.length) return;
    tl.fromTo(icons,
      { strokeDasharray: 100, strokeDashoffset: 100 },
      { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut", stagger: 0.08, clearProps: "strokeDasharray,strokeDashoffset" },
      at);
  }

  // Desliga transições/animações CSS enquanto o GSAP controla o transform.
  function lock(els) { els.forEach(function (el) { el.classList.add("fx-lock"); }); }
  function unlock(els) { els.forEach(function (el) { el.classList.remove("fx-lock"); }); }

  // Contador numérico.
  function countUp(tl, el, to, suffix, at) {
    if (!el) return;
    var o = { v: 0 };
    tl.to(o, {
      v: to, duration: 1.4, ease: "expo.out",
      onUpdate: function () { el.textContent = Math.round(o.v) + suffix; }
    }, at);
  }

  // Dígitos embaralhados que assentam da esquerda para a direita.
  function scramble(tl, el, at) {
    if (!el) return;
    var final = el.textContent;
    var o = { p: 0 };
    tl.to(o, {
      p: 1, duration: 1.2, ease: "power1.out",
      onUpdate: function () {
        var settled = Math.floor(o.p * final.length);
        el.textContent = final.split("").map(function (ch, i) {
          return i < settled || !/\d/.test(ch) ? ch : String(Math.floor(Math.random() * 10));
        }).join("");
      },
      onComplete: function () { el.textContent = final; }
    }, at);
  }

  // Anel de luz (seções escuras).
  function ring(host, style) {
    host.classList.add("fx-host");
    var r = document.createElement("span");
    r.className = "fx-ring";
    r.setAttribute("aria-hidden", "true");
    Object.assign(r.style, style);
    host.insertBefore(r, host.firstChild);
    return r;
  }

  // Timeline disparada quando a seção entra na tela.
  function onEnter(trigger, build, start) {
    if (!trigger) return;
    var tl = gsap.timeline({ paused: true });
    build(tl);
    ScrollTrigger.create({ trigger: trigger, start: start || "top 75%", end: "max", once: true, onEnter: function () { tl.play(); } });
  }

  // Itens de grade entram em lotes conforme aparecem.
  function batch(els, fromVars, toVars) {
    if (!els.length) return;
    lock(els);
    gsap.set(els, fromVars);
    ScrollTrigger.batch(els, {
      start: "top 88%", end: "max", once: true,
      onEnter: function (group) {
        gsap.to(group, Object.assign({
          stagger: 0.12,
          clearProps: "transform,opacity,filter",
          onComplete: function () { unlock(group); }
        }, toVars));
      }
    });
  }

  document.documentElement.classList.add("fx");

  /* ================= Cabeçalho ================= */
  (function () {
    var tl = gsap.timeline({ delay: 0.05 });
    tl.fromTo(".topbar__inner > *", { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power3.out", clearProps: "transform" });
    tl.fromTo(".brand img", { scale: 0, rotation: -160 }, { scale: 1, rotation: 0, duration: 1, ease: "elastic.out(1, .5)", clearProps: "transform" }, 0.1);
    tl.fromTo(".brand__text", { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.6, ease: "power3.out", clearProps: "transform" }, 0.3);
    if (window.matchMedia("(min-width: 901px)").matches) {
      var links = $$(".nav > a");
      lock(links);
      tl.fromTo(links, { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: "back.out(2)", clearProps: "transform,opacity", onComplete: function () { unlock(links); } }, 0.25);
    }
  })();

  /* ================= Hero ================= */
  (function () {
    var hero = $(".hero");
    if (!hero) return;
    var tl = gsap.timeline({ delay: 0.25 });

    // Decoração de fundo
    tl.fromTo(".hero__sun", { scale: 0 }, { scale: 1, duration: 1.4, ease: "elastic.out(1, .55)", clearProps: "transform" }, 0);
    tl.fromTo(".hero__dot-br", { scale: 0 }, { scale: 1, duration: 1.4, ease: "elastic.out(1, .55)", clearProps: "transform" }, 0.2);
    tl.fromTo(".hero__blob--bl, .hero__wave", { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: 1.2, ease: "expo.out", stagger: 0.1, clearProps: "transform" }, 0.1);
    tl.from(".hero__paw--l", { scale: 0, rotation: "-=160", duration: 1.1, ease: "back.out(2.5)" }, 0.6);

    // Texto
    tl.fromTo(".hero__eyebrow-icon", { scale: 0, rotation: -200 }, { scale: 1, rotation: 0, duration: 0.9, ease: "back.out(3)", clearProps: "transform" }, 0.1);
    eyebrow(tl, $(".hero__eyebrow"), 0.15);
    kinetic(tl, $(".hero h1"), 0.3, SPARK_LIGHT, true);
    words(tl, $(".hero__lead"), "-=0.9");
    pop(tl, $$(".hero__actions .hbtn"), "-=0.5");
    tl.fromTo(".hero__trust", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1, ease: "expo.inOut", clearProps: "clipPath" }, "-=0.6");
    tl.fromTo(".hero__trust-icon", { scale: 0, rotation: -120 }, { scale: 1, rotation: 0, duration: 0.8, stagger: 0.12, ease: "back.out(3)", clearProps: "transform" }, "<0.2");
    countUp(tl, $(".hero__trust li:first-child strong"), 350, " m", "<");

    // Visual
    tl.fromTo(".hero__pets",
      { clipPath: "circle(0% at 55% 58%)", scale: 1.2 },
      { clipPath: "circle(75% at 55% 58%)", scale: 1, duration: 1.5, ease: "expo.inOut", clearProps: "clipPath,transform" }, 0.35);
    var cards = $$(".hcard");
    lock(cards);
    tl.fromTo(cards,
      { opacity: 0, scale: 0.3, rotationX: 60, rotationY: function (i) { return i ? -40 : 40; }, transformPerspective: 800, y: 40 },
      { opacity: 1, scale: 1, rotationX: 0, rotationY: 0, y: 0, duration: 1.1, ease: "back.out(1.8)", stagger: 0.18, clearProps: "transform,opacity", onComplete: function () { unlock(cards); } },
      1.1);
  })();

  /* ================= Promo ================= */
  onEnter($(".promo"), function (tl) {
    tl.fromTo(".promo", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1, ease: "expo.inOut", clearProps: "clipPath" });
    pop(tl, $(".promo__badge"), "-=0.4", { from: { rotation: -12 }, to: { rotation: 0 } });
    words(tl, $(".promo__inner p"), "<0.1");
    tl.fromTo(".promo__inner > a", { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.7, ease: "back.out(2)", clearProps: "transform" }, "-=0.3");
  }, "top 90%");

  /* ================= Serviços ================= */
  onEnter($(".services"), function (tl) {
    tl.fromTo(".services__corner--tl", { scale: 0, transformOrigin: "0% 0%" }, { scale: 1, duration: 1.3, ease: "elastic.out(1, .6)", clearProps: "transform" }, 0);
    tl.fromTo(".services__corner--br, .services__corner--bl", { scale: 0, transformOrigin: "100% 100%" }, { scale: 1, duration: 1.3, ease: "elastic.out(1, .6)", stagger: 0.15, clearProps: "transform" }, 0.1);
    tl.from(".services__paw", { scale: 0, rotation: "+=180", duration: 1, ease: "back.out(2.5)", stagger: 0.2 }, 0.3);
    eyebrow(tl, $(".services__eyebrow"), 0.1);
    kinetic(tl, $(".services__head h2"), 0.25, SPARK_LIGHT, false);
    words(tl, $(".services__sub"), "-=0.9");
  });

  batch($$(".sv"),
    { opacity: 0, y: 90, scale: 0.85, rotationX: -28, rotationY: function (i) { return i % 2 ? -14 : 14; }, transformPerspective: 1100, transformOrigin: "50% 100%" },
    { opacity: 1, y: 0, scale: 1, rotationX: 0, rotationY: 0, duration: 1.1, ease: "back.out(1.5)" });
  $$(".sv").forEach(function (card) {
    var img = $("img", card);
    var chip = $(".sv__chip", card);
    var body = $$(".sv__body > :not(.sv__chip)", card);
    lock([img]);
    gsap.set(img, { scale: 1.35 });
    gsap.set(chip, { opacity: 0, scale: 0.4, x: -20 });
    gsap.set(body, { opacity: 0, y: 18 });
    ScrollTrigger.create({
      trigger: card, start: "top 88%", end: "max", once: true,
      onEnter: function () {
        gsap.to(img, { scale: 1, duration: 1.6, ease: "expo.out", clearProps: "transform", onComplete: function () { unlock([img]); } });
        gsap.to(chip, { opacity: 1, scale: 1, x: 0, duration: 0.8, delay: 0.35, ease: "back.out(2.6)", clearProps: "transform" });
        gsap.to(body, { opacity: 1, y: 0, duration: 0.6, delay: 0.5, stagger: 0.08, ease: "power3.out", clearProps: "transform" });
      }
    });
  });

  /* ================= Especialidades (escura) ================= */
  (function () {
    var sec = $("#especialidades");
    if (!sec) return;
    var r = ring(sec, { width: "560px", height: "560px", right: "-180px", top: "-220px" });
    onEnter(sec, function (tl) {
      tl.fromTo(r, { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.8, ease: "expo.out" }, 0);
      tl.call(function () { gsap.to(r, { scale: 1.06, duration: 5, ease: "sine.inOut", yoyo: true, repeat: -1 }); });
      eyebrow(tl, $(".eyebrow", sec), 0.1);
      kinetic(tl, $("h2", sec), 0.25, SPARK_DARK, true);
      words(tl, $(".section__head > p", sec), "-=0.9");
    });
    var specs = $$(".spec", sec);
    batch(specs,
      { opacity: 0, scale: 0.6, rotationY: -70, transformPerspective: 900, filter: "blur(8px)" },
      { opacity: 1, scale: 1, rotationY: 0, filter: "blur(0px)", duration: 1, stagger: 0.08, ease: "back.out(1.7)" });
    specs.forEach(function (li) {
      var icon = $(".spec__icon", li);
      gsap.set(icon, { scale: 0, rotation: -180 });
      ScrollTrigger.create({
        trigger: li, start: "top 88%", end: "max", once: true,
        onEnter: function () {
          var tl = gsap.timeline({ delay: 0.25 });
          tl.to(icon, { scale: 1, rotation: 0, duration: 1, ease: "elastic.out(1, .45)", clearProps: "transform" });
          tl.fromTo(icon, { boxShadow: "0 0 0 0 rgba(255,178,63,.65)" }, { boxShadow: "0 0 0 18px rgba(255,178,63,0)", duration: 0.9, ease: "power2.out", clearProps: "boxShadow" }, 0.15);
          draw(tl, $(".ic", icon), 0.1);
        }
      });
    });
  })();

  /* ================= Diferenciais ================= */
  (function () {
    var sec = $(".section--cream");
    if (!sec) return;
    onEnter(sec, function (tl) {
      eyebrow(tl, $(".eyebrow", sec), 0);
      kinetic(tl, $("h2", sec), 0.15, SPARK_LIGHT, false);
    });
    var values = $$(".value", sec);
    batch(values,
      { opacity: 0, x: -60, rotationY: 45, scale: 0.9, transformPerspective: 1000, transformOrigin: "0% 50%" },
      { opacity: 1, x: 0, rotationY: 0, scale: 1, duration: 1.1, stagger: 0.15, ease: "expo.out" });
    values.forEach(function (v, i) {
      var num = $(".value__num", v);
      var icon = $(".value__icon", v);
      var txt = $$("h3, p", v);
      gsap.set(num, { opacity: 0, scale: 2.6, filter: "blur(10px)" });
      gsap.set(txt, { opacity: 0, y: 16 });
      gsap.set(icon, { strokeDasharray: 100, strokeDashoffset: 100 });
      ScrollTrigger.create({
        trigger: v, start: "top 88%", end: "max", once: true,
        onEnter: function () {
          var tl = gsap.timeline({ delay: 0.3 + i * 0.15 });
          tl.to(num, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.9, ease: "expo.out", clearProps: "transform,filter" });
          tl.to(icon, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut", clearProps: "strokeDasharray,strokeDashoffset" }, 0.1);
          tl.to(txt, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power3.out", clearProps: "transform" }, 0.25);
        }
      });
    });
  })();

  /* ================= Sobre ================= */
  (function () {
    var sec = $("#sobre");
    if (!sec) return;
    onEnter(sec, function (tl) {
      tl.fromTo(".about__media img",
        { clipPath: "inset(100% 0% 0% 0% round 24px)", scale: 1.3 },
        { clipPath: "inset(0% 0% 0% 0% round 24px)", scale: 1, duration: 1.4, ease: "expo.inOut", clearProps: "clipPath,transform" }, 0);
      pop(tl, $(".about__badge"), 0.9, { from: { rotation: -14, scale: 0.2 }, to: { rotation: 0, ease: "elastic.out(1, .5)", duration: 1.2 } });
      scramble(tl, $(".about__badge strong"), 1);

      var copy = $(".about__copy", sec);
      eyebrow(tl, $(".eyebrow", copy), 0.2);
      kinetic(tl, $("h2", copy), 0.35, SPARK_LIGHT, true);
      $$(":scope > p:not(.eyebrow)", copy).forEach(function (p, i) { words(tl, p, i ? "<0.2" : "-=1.1"); });
      var checks = $$(".checks li", copy);
      tl.fromTo(checks, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.6, stagger: 0.1, ease: "back.out(2)", clearProps: "transform" }, "-=0.3");
      draw(tl, $$(".checks .ic", copy), "<0.1");
      pop(tl, $(".btn", copy), "-=0.6");
    });
  })();

  /* ================= Depoimentos ================= */
  (function () {
    var sec = $("#depoimentos");
    if (!sec) return;
    onEnter(sec, function (tl) {
      eyebrow(tl, $(".eyebrow", sec), 0);
      kinetic(tl, $("h2", sec), 0.15, SPARK_LIGHT, true);
    });
    var reviews = $$(".review", sec);
    batch(reviews,
      { opacity: 0, y: 70, scale: 0.88, rotation: function (i) { return [-5, 4, -3][i % 3]; } },
      { opacity: 1, y: 0, scale: 1, rotation: 0, duration: 1, stagger: 0.14, ease: "back.out(1.7)" });
    reviews.forEach(function (rv, i) {
      var stars = $$(".stars svg", rv);
      var quote = $("blockquote", rv);
      var cap = $("figcaption", rv);
      var ctaIcon = rv.classList.contains("review--cta") ? $(".ic--xl", rv) : null;
      if (quote) splitText(quote);
      var qWords = quote ? $$(".fx-w", quote) : [];
      if (stars.length) gsap.set(stars, { scale: 0, rotation: -180 });
      if (qWords.length) gsap.set(qWords, { opacity: 0, y: 10 });
      gsap.set([cap, ctaIcon].filter(Boolean), { opacity: 0, scale: 0.5 });
      ScrollTrigger.create({
        trigger: rv, start: "top 88%", end: "max", once: true,
        onEnter: function () {
          var tl = gsap.timeline({ delay: 0.3 + i * 0.14 });
          if (stars.length) tl.to(stars, { scale: 1, rotation: 0, duration: 0.8, stagger: 0.07, ease: "elastic.out(1.2, .45)", clearProps: "transform" });
          if (qWords.length) tl.to(qWords, { opacity: 1, y: 0, duration: 0.45, stagger: { amount: 0.6 }, ease: "power3.out", clearProps: "transform" }, 0.2);
          tl.to([cap, ctaIcon].filter(Boolean), { opacity: 1, scale: 1, duration: 0.8, ease: "back.out(2.6)", clearProps: "transform" }, 0.5);
          if (ctaIcon) tl.from(ctaIcon, { rotation: -216, duration: 1.2, ease: "back.out(2)" }, 0.5);
        }
      });
    });
  })();

  /* ================= Contato ================= */
  (function () {
    var sec = $("#contato");
    if (!sec) return;
    onEnter(sec, function (tl) {
      eyebrow(tl, $(".eyebrow", sec), 0);
      kinetic(tl, $("h2", sec), 0.15, SPARK_LIGHT, false);
      words(tl, $(".section__head > p", sec), "-=0.9");
    });
    onEnter($(".visit", sec), function (tl) {
      tl.fromTo(".visit__map",
        { clipPath: "circle(0% at 50% 50%)", scale: 0.9 },
        { clipPath: "circle(80% at 50% 50%)", scale: 1, duration: 1.5, ease: "expo.inOut", clearProps: "clipPath,transform" }, 0);
      var blocks = $$(".visit__info .info-block", sec);
      tl.fromTo(blocks, { opacity: 0, x: 50 }, { opacity: 1, x: 0, duration: 0.8, stagger: 0.12, ease: "expo.out", clearProps: "transform" }, 0.2);
      draw(tl, $$(".visit__info h3 .ic", sec), 0.35);
      tl.fromTo($$(".hours tr", sec), { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.07, ease: "power3.out", clearProps: "transform" }, 0.55);
      pop(tl, $$(".contact-pill", sec), 0.7);
      pop(tl, $$(".pay li", sec), 0.9, { to: { stagger: 0.06 } });
    }, "top 80%");
  })();

  /* ================= CTA final (escura) ================= */
  (function () {
    var sec = $(".cta");
    if (!sec) return;
    var r = ring(sec, { width: "420px", height: "420px", left: "-140px", bottom: "-240px" });
    onEnter(sec, function (tl) {
      tl.fromTo(r, { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.8, ease: "expo.out" }, 0);
      tl.call(function () { gsap.to(r, { scale: 1.08, duration: 5, ease: "sine.inOut", yoyo: true, repeat: -1 }); });
      kinetic(tl, $("h2", sec), 0.1, SPARK_DARK, true);
      words(tl, $(".cta__inner p", sec), "-=0.9");
      pop(tl, $$(".cta__actions .btn", sec), "-=0.5", { to: { ease: "elastic.out(1, .5)", duration: 1.2 } });
    }, "top 80%");
  })();

  /* ================= Rodapé ================= */
  onEnter($(".footer"), function (tl) {
    tl.fromTo(".footer__brand img", { scale: 0, rotation: -180 }, { scale: 1, rotation: 0, duration: 1, ease: "elastic.out(1, .55)", clearProps: "transform" }, 0);
    tl.fromTo(".footer__grid > *", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: "expo.out", clearProps: "transform" }, 0.1);
    pop(tl, $$(".social a"), 0.5);
    tl.fromTo(".footer__bottom", { opacity: 0 }, { opacity: 1, duration: 0.8 }, 0.6);
  }, "top 90%");
})();
