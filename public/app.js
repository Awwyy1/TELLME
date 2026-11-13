// tellme.mom — main page logic.
(function () {
  'use strict';

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  function $(id) { return document.getElementById(id); }

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Browser storage. Everything here stays on this device.
  var store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
    }
  };

  var currentNeed = null;
  var currentMessage = "";
  var currentNote = "";
  var view = "intro";

  var needLabels = {
    pride:     "being proud of you",
    love:      "unconditional love",
    enough:    "being enough",
    safe:      "feeling safe",
    strong:    "your strength",
    seen:      "being seen",
    home:      "always having a home",
    surprise:  "what you need most",
    interview: "your interview tomorrow",
    exam:      "your exam",
    newstart:  "a new beginning",
    breakup:   "a broken heart",
    birthday:  "your birthday",
    newparent: "becoming a parent",
    hardnews:  "hard news"
  };

  // Letters written ahead of time. Shown only when a new letter can't be
  // written, and always with an honest note saying so.
  var KEEPSAKE_LETTERS = {
    pride: [
      "Watching you keep going on the days nobody noticed has been one of the quiet joys of my life. You didn't need a trophy or a title for me to feel this way. The way you are kind when it costs you something, the way you try again. That is what makes me proud. Just you, exactly as you are.",
      "There is something in the way you carry yourself now that wasn't there years ago, and it moves me every time. You grew into it slowly, mostly alone, and still you came out gentle. Pride is too small a word for what I feel, but it's the closest one I have.",
      "Nobody handed you an easy road, and you walked it anyway. Not perfectly, not without falling, but honestly, and with a heart that stayed open. That is what I'm proudest of, more than anything you could ever achieve."
    ],
    love: [
      "Before you did a single thing, before your first word or your first mistake, you were already loved. Nothing you've done since has changed that, and nothing you do tomorrow will. On the messy days, the quiet days, the days you don't like yourself very much, the love is still here, steady and unbothered.",
      "You don't have to earn this. You never did. My love isn't a prize for good behaviour; it is simply what happens when I think of you. Even now, even here, it's wrapped all the way around you.",
      "Some love comes with conditions, and I'm so sorry if that's the kind you learned first. This is the other kind. It stays when you fail, it stays when you're difficult, it stays when you have nothing left to give."
    ],
    enough: [
      "You keep trying to become someone worth loving, and my heart aches a little every time, because you already are. There is nothing to fix and nothing missing. The parts of you that you hide are not flaws to me. They are simply you, and you are enough.",
      "Rest for a moment. You don't have to be more productive, more cheerful, more anything for me to be glad you exist. You were enough the day you were born, and you are enough tonight.",
      "Whatever voice told you that you were too much or not enough, it was wrong. You were never a problem to be solved. You are a whole person, and that has always been plenty."
    ],
    safe: [
      "Here you can put everything down. You don't have to be strong, or polite, or okay. If you need to cry, cry; if you need to say nothing at all, that's fine too. Nothing you feel will make me pull away.",
      "Come in, close the door, take off the armour you've been wearing all day. No one here is keeping score. You can be tired, confused, unfinished, and still completely safe.",
      "So many places asked you to be careful, to be quiet, to be good. This isn't one of them. With me, you can fall apart, and I will simply sit beside you until you're ready to stand."
    ],
    strong: [
      "Look at everything you have already lived through: the nights you thought would never end, and did. You are still here, still trying, and that is what strength actually looks like. You can be scared and keep going at the same time.",
      "Being exhausted doesn't mean you're weak; it means you've been carrying a lot for a long time. You've done hard things before, often without anyone noticing. Take a breath. You can do this one too, one small step at a time.",
      "Strength isn't the absence of shaking hands. It's what you've been doing all along: getting up, showing up, trying again. Whatever is in front of you now, you don't have to face it fearless."
    ],
    seen: [
      "There is so much you do that nobody notices: the effort behind the easy smile, the worries you keep to yourself so others don't have to carry them. I notice. I see the tired parts and the brave parts, and I love all of them.",
      "The version of you the world gets is lovely, but it's not the whole story. Underneath there's someone deeper, softer, and more thoughtful than most people take the time to find. That someone is who I see when I look at you.",
      "You've gotten so good at being fine that people forget to ask. So let me ask: how are you, really? Whatever the answer is, it matters to me, because the real you, all of you, matters to me."
    ],
    home: [
      "Wherever you are tonight, however far you've wandered, there is a light on for you. Home was never a building. It's the feeling of being wanted, and you are wanted. The door is open, and it stays open.",
      "You belong. Not because you fit in, not because you've earned a place, but simply because you are you. No distance and no amount of time can wear that thread thin.",
      "On the nights you feel like you don't belong anywhere, come back to this: there is a place in my heart shaped exactly like you. Nobody else could ever fill it. You always have somewhere to come home to."
    ],
    surprise: [
      "Whatever today held, you made it here, and that counts for something. You've been so hard on yourself lately. Maybe tonight you could be just a little gentler. You deserve the same kindness you give so easily to everyone else.",
      "Sometimes the bravest thing is simply to keep your heart soft in a hard world, and you have. Thank you for still being you. Your existence makes the world warmer.",
      "After this, put the phone down for a moment and take one slow breath. Nothing needs solving in this exact second. You are loved, you are allowed to rest, and tomorrow can wait until tomorrow."
    ],
    interview: [
      "Whatever happens in that room tomorrow, it won't change a single thing about how much you're worth. You don't have to be perfect; you only have to be yourself, and that has always been more than enough. Get some rest tonight. You're ready in all the ways that matter.",
      "Before you walk in, take one slow breath and remember who you are outside of that room: kind, capable, someone people are lucky to have around. They are deciding about a job, not about you. Either way, you come home to the same love."
    ],
    exam: [
      "One exam can measure what you remembered on a single morning, but it can't measure you. The effort you've put in is real, and it counts even if the result doesn't show all of it. Whatever the grade, I'll be just as proud and just as glad you're mine.",
      "Put the notes down for a moment and let your shoulders drop. You've done the work you could do, and the rest isn't yours to carry tonight. You are so much more than any score."
    ],
    newstart: [
      "Starting over takes a kind of courage most people never notice. Being new is awkward and lonely and a little frightening, and you're doing it anyway. Give yourself time to find your feet. You've done it before, and you'll do it again.",
      "Every place that feels like home now once felt strange. This new beginning will too, one small familiar thing at a time. I believe in you completely, even on the days you're not sure you belong there yet."
    ],
    breakup: [
      "Of course it hurts. You loved with your whole heart, and that is never a mistake. You don't have to be over it by any deadline. Let yourself be sad for as long as you need; you are still so deeply lovable, exactly as you are.",
      "Tonight you might feel like you're not enough, or that something in you made this happen. Neither is true. Hearts break because they were open, and yours is one of the most open I know. It will mend, slowly, and it will love again."
    ],
    birthday: [
      "Happy birthday, my love. On this day, the world got you, and it has been warmer ever since. Whatever this year brought, I'm so glad you're here, and I hope today someone celebrates you the way you deserve.",
      "Another year of you, and I'm grateful for every single day of it. You've grown and stumbled and kept going, and I love who you're becoming. Light a candle for yourself today. You are worth celebrating."
    ],
    newparent: [
      "Look at you, holding a whole new life. You don't need to know everything, and you don't need to become the parent you never had overnight. The tenderness you're already giving is real, and it's enough. Please let someone take care of you, too.",
      "Some nights you'll feel lost and tired and unsure you're doing any of it right. That's what loving a child feels like for everyone. You are breaking old patterns just by trying, and I am so proud of you."
    ],
    hardnews: [
      "You don't have to be strong about this right now, and you don't have to understand it all yet. Just breathe. Whatever comes next, you won't face it alone.",
      "Some news knocks the air out of you, and it's okay to sit down where you are. You don't need a plan tonight or the right words. Let yourself feel what you feel. I'm right here beside you."
    ]
  };

  var NOTES = {
    offline: "You're offline right now, so this letter was written earlier, with the same love. When you're connected again, a new one can be written for you.",
    daily_limit: "So many people needed these words today that we've reached our daily limit. This letter was written earlier, with the same love. New ones will be written tomorrow.",
    daily_visitor_limit: "You've received many letters today. This one was written earlier, with the same love. New ones will be waiting for you tomorrow.",
    verification_failed: "We couldn't confirm the connection, so this letter was written earlier, with the same love. You can try again in a moment.",
    fallback: "We couldn't write a new letter just now, so this one was written earlier, with the same love. You can try again in a moment."
  };

  // ── Name (stays in this browser; never sent to the server) ──
  var nameInput = $("nameInput");

  function cleanName(v) {
    return String(v || "").replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 30);
  }
  var userName = cleanName(store.get("tellme.name", ""));
  nameInput.value = userName;

  function salutation() { return userName ? "My dear " + userName + "," : "My dear,"; }

  nameInput.addEventListener("input", function () {
    userName = cleanName(nameInput.value);
    store.set("tellme.name", userName);
  });
  nameInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); $("receiveBtn").click(); }
  });

  // ── Views ─────────────────────────────────────────────
  var actionButtons = ["againBtn", "shareBtn", "keepBtn", "backBtn"].map($);

  function setActionsEnabled(on) {
    actionButtons.forEach(function (b) { b.disabled = !on; });
  }

  function hideAll() {
    $("introView").style.display = "none";
    $("loadingView").classList.remove("visible");
    var mv = $("messageView");
    mv.classList.remove("visible");
    mv.style.display = "none";
  }

  function showLoading(withEnvelope) {
    hideAll();
    var env = $("envelope");
    env.classList.remove("opening");
    env.hidden = !withEnvelope;
    $("loadingView").classList.add("visible");
    view = "loading";
  }

  function showIntro() {
    hideAll();
    var iv = $("introView");
    iv.style.display = "";
    iv.style.animation = "fadeUp 0.6s ease-out both";
    view = "intro";
  }

  // opts.writing: the letter is still being written (text arrives later).
  function showMessage(msg, need, note, opts) {
    opts = opts || {};
    hideAll();
    $("letterSalutation").textContent = salutation();
    $("letterBody").textContent = msg;
    $("needLabel").textContent = needLabels[need] || need;
    var noteEl = $("letterNote");
    noteEl.textContent = note || "";
    noteEl.hidden = !note;

    var mv = $("messageView");
    mv.style.display = "flex";
    void mv.offsetWidth;
    mv.classList.add("visible");
    view = "message";

    if (opts.writing) {
      mv.classList.add("writing");
      $("letter").classList.add("writing");
      $("letterBody").classList.add("writing");
      setActionsEnabled(false);
    } else {
      finishMessage(msg, note);
    }
  }

  // Called when a letter is complete on screen.
  function finishMessage(msg, note) {
    currentMessage = msg;
    currentNote = note || "";
    var mv = $("messageView");
    mv.classList.remove("writing");
    $("letter").classList.remove("writing");
    $("letterBody").classList.remove("writing");
    $("letterBody").textContent = msg;
    setActionsEnabled(true);
    updateKeepButton();
    // Move focus to the letter so keyboard and screen-reader users land on it.
    $("letter").focus({ preventScroll: true });
  }

  function restoreView(prev) {
    if (prev === "message" && currentMessage) showMessage(currentMessage, currentNeed, currentNote);
    else showIntro();
  }

  // ── Need chips (themes + situations) ──────────────────
  var chips = Array.prototype.slice.call(document.querySelectorAll(".need-chip"));
  var themeChips = Array.prototype.slice.call(document.querySelectorAll("#needsGrid .need-chip"));

  function selectChip(chip) {
    chips.forEach(function (c) {
      c.classList.remove("selected");
      c.setAttribute("aria-pressed", "false");
    });
    currentNeed = null;
    if (chip) {
      chip.classList.add("selected");
      chip.setAttribute("aria-pressed", "true");
      currentNeed = chip.getAttribute("data-need");
    }
  }

  $("introView").addEventListener("click", function (e) {
    var chip = e.target.closest(".need-chip");
    if (chip) selectChip(chip);
  });

  function setSituationsOpen(open) {
    $("situationsGrid").hidden = !open;
    $("situationsToggle").setAttribute("aria-expanded", open ? "true" : "false");
  }
  $("situationsToggle").addEventListener("click", function () {
    setSituationsOpen($("situationsGrid").hidden);
  });

  $("receiveBtn").addEventListener("click", function () {
    // With nothing chosen, pick one of the general themes (never a situation).
    if (!currentNeed) selectChip(themeChips[Math.floor(Math.random() * themeChips.length)]);
    requestLetter(currentNeed, true);
  });

  $("againBtn").addEventListener("click", function () {
    requestLetter(currentNeed, false);
  });

  $("backBtn").addEventListener("click", function () {
    selectChip(null);
    showIntro();
    themeChips[0].focus({ preventScroll: true });
  });

  // ── Cloudflare Turnstile (only if the server provides a site key) ──
  var ts = { siteKey: null, widgetId: null, used: false, pending: null, readyResolve: null };
  var turnstileReady = new Promise(function (resolve) { ts.readyResolve = resolve; });

  function resolveToken(token) {
    if (ts.pending) { var p = ts.pending; ts.pending = null; p(token); }
  }

  window.onTurnstileLoad = function () {
    try {
      ts.widgetId = window.turnstile.render("#turnstileBox", {
        sitekey: ts.siteKey,
        execution: "execute",
        appearance: "interaction-only",
        theme: "auto",
        callback: function (token) { resolveToken(token); },
        "error-callback": function () { resolveToken(null); },
        "expired-callback": function () { ts.used = true; },
        "timeout-callback": function () { resolveToken(null); }
      });
    } catch (e) { ts.widgetId = null; }
    ts.readyResolve();
  };

  fetch("/api/config")
    .then(function (r) { return r.ok ? r.json() : {}; })
    .then(function (cfg) {
      if (!cfg || !cfg.turnstileSiteKey) { ts.readyResolve(); return; }
      ts.siteKey = cfg.turnstileSiteKey;
      var s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";
      s.async = true;
      s.onerror = function () { ts.readyResolve(); };
      document.head.appendChild(s);
    })
    .catch(function () { ts.readyResolve(); });

  function delay(ms, value) {
    return new Promise(function (resolve) { setTimeout(function () { resolve(value); }, ms); });
  }

  function getTurnstileToken() {
    return Promise.race([turnstileReady, delay(6000)]).then(function () {
      if (!ts.siteKey || ts.widgetId === null || !window.turnstile) return null;
      return new Promise(function (resolve) {
        ts.pending = resolve;
        try {
          if (ts.used) window.turnstile.reset(ts.widgetId);
          ts.used = true;
          window.turnstile.execute(ts.widgetId);
        } catch (e) { resolveToken(null); }
        // Give an interactive challenge time, but never hang forever.
        setTimeout(function () { if (ts.pending === resolve) resolveToken(null); }, 25000);
      });
    });
  }

  // ── Letters ───────────────────────────────────────────
  function fetchWithTimeout(url, options, ms) {
    if (!window.AbortController) return fetch(url, options);
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, ms);
    options.signal = ctrl.signal;
    return fetch(url, options).finally(function () { clearTimeout(timer); });
  }

  function keepsakeLetter(need) {
    var list = KEEPSAKE_LETTERS[need] || KEEPSAKE_LETTERS.surprise;
    var options = list.filter(function (t) { return t !== currentMessage; });
    if (!options.length) options = list;
    return options[Math.floor(Math.random() * options.length)];
  }

  var busy = false;
  var requestId = 0;

  function showKeepsake(id, need, code) {
    if (id !== requestId) return;
    showMessage(keepsakeLetter(need), need, NOTES[code] || NOTES.fallback);
  }

  // The envelope opens before the first letter of a visit from the intro.
  function openEnvelope(id, done) {
    var env = $("envelope");
    if (env.hidden || reducedMotion) { done(); return; }
    env.classList.add("opening");
    setTimeout(function () { if (id === requestId) done(); }, 1250);
  }

  // Letters never contain dashes: any that slip through become commas.
  // Hyphens inside words (well-being) are kept.
  function removeDashes(text, isFinal) {
    var t = String(text)
      .replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, "$1 to $2")
      .replace(/\s*[\u2013\u2014]+\s*/g, ", ")
      .replace(/\s+-{1,2}\s+/g, ", ")
      .replace(/,\s*([.,;:!?])/g, "$1")
      .replace(/^[,\s]+/, "")
      .replace(/ {2,}/g, " ");
    return isFinal ? t.replace(/[,\s]+$/, "") : t;
  }

  // Writing pace. Tune here: milliseconds per character, and extra pauses
  // after punctuation so the letter reads like it is being written by hand.
  var PACE = { charMs: 26, commaPauseMs: 110, sentencePauseMs: 320 };

  // Reveals text at a calm, handwriting-like pace while it streams in.
  function createWriter(el, onDone) {
    var raw = "", target = "", shown = 0, started = false, ended = false, cancelled = false, timer = null;
    function tick() {
      if (cancelled) return;
      var backlog = target.length - shown;
      var wait = PACE.charMs;
      if (backlog > 0) {
        // Always one character at a time: the pace never speeds up, however
        // much text has already arrived from the server.
        var step = reducedMotion ? backlog : 1;
        shown = Math.min(target.length, shown + step);
        el.textContent = target.slice(0, shown);
        var last = target.charAt(shown - 1);
        if (!reducedMotion && shown < target.length) {
          if (/[.!?]/.test(last)) wait += PACE.sentencePauseMs;
          else if (/[,;:]/.test(last)) wait += PACE.commaPauseMs;
        }
      }
      if (ended && shown >= target.length) { onDone(); return; }
      timer = setTimeout(tick, wait);
    }
    return {
      push: function (t) { raw += t; target = removeDashes(raw, false); },
      start: function () { if (!started) { started = true; tick(); } },
      end: function (finalText) { target = finalText; ended = true; },
      cancel: function () { cancelled = true; clearTimeout(timer); }
    };
  }

  function readEventStream(response, onEvent) {
    var reader = response.body.getReader();
    var decoder = new TextDecoder();
    var buffer = "";
    function pump() {
      return reader.read().then(function (res) {
        if (res.done) return;
        buffer += decoder.decode(res.value, { stream: true });
        var idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          var block = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          var data = block.split("\n")
            .filter(function (l) { return l.indexOf("data:") === 0; })
            .map(function (l) { return l.slice(5).trim(); })
            .join("");
          if (!data) continue;
          var evt;
          try { evt = JSON.parse(data); } catch (e) { continue; }
          if (onEvent(evt) === false) { reader.cancel().catch(function () {}); return; }
        }
        return pump();
      });
    }
    return pump();
  }

  function handleStream(id, response, need) {
    var full = "";
    var writer = null;
    var finished = false;
    var failed = false;

    function begin() {
      writer = createWriter($("letterBody"), function () {
        if (id === requestId) finishMessage(removeDashes(full, true), "");
      });
      openEnvelope(id, function () {
        if (failed) return; // a keepsake letter is already on screen
        showMessage("", need, "", { writing: true });
        writer.start();
      });
    }

    function fail(code) {
      finished = true;
      failed = true;
      if (writer) writer.cancel();
      showKeepsake(id, need, code || "fallback");
    }

    return readEventStream(response, function (evt) {
      if (id !== requestId) return false;
      if (evt.t) {
        full += evt.t;
        if (!writer) begin();
        writer.push(evt.t);
      } else if (evt.error) {
        fail(evt.error === "busy" ? "fallback" : evt.error);
        return false;
      } else if (evt.done) {
        finished = true;
        if (!full.trim()) { fail("fallback"); return false; }
        writer.end(removeDashes(full, true));
        return false;
      }
    }).then(function () {
      if (!finished) { if (full.trim() && writer) writer.end(removeDashes(full, true)); else fail("fallback"); }
    }, function () {
      if (!finished) fail("fallback");
    });
  }

  function requestLetter(need, fromIntro) {
    if (busy) return;
    busy = true;
    var id = ++requestId;
    var prev = view;
    showLoading(fromIntro && !reducedMotion);

    if (navigator.onLine === false) {
      // A small pause so it doesn't feel abrupt.
      setTimeout(function () { busy = false; showKeepsake(id, need, "offline"); }, 600);
      return;
    }

    getTurnstileToken()
      .then(function (token) {
        var payload = { need: need, stream: true };
        if (token) payload.turnstileToken = token;
        return fetchWithTimeout("/api/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }, 45000);
      })
      .then(function (r) {
        var type = r.headers.get("content-type") || "";
        if (r.ok && type.indexOf("text/event-stream") !== -1 && r.body && r.body.getReader) {
          return handleStream(id, r, need);
        }
        return r.json()
          .catch(function () { return {}; })
          .then(function (d) {
            if (r.ok && d && d.message) {
              openEnvelope(id, function () { showMessage(removeDashes(d.message, true), need, ""); });
            } else if (r.status === 429 && d && d.code === "rate_limited") {
              showToast("Take a breath… try again in " + (d.retryAfter || 60) + "s");
              restoreView(prev);
            } else {
              showKeepsake(id, need, d && d.code);
            }
          });
      })
      .catch(function () { showKeepsake(id, need, navigator.onLine === false ? "offline" : "fallback"); })
      .finally(function () { busy = false; });
  }

  var toastTimer = null;
  function showToast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2800);
  }

  // ── Dialogs: a stack, so one can open on top of another ──
  var dialogs = [];
  var FOCUSABLE = 'a[href], button:not([disabled]):not([hidden]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function openDialog(overlay, focusTarget) {
    if (dialogs.some(function (d) { return d.overlay === overlay; })) return;
    dialogs.push({ overlay: overlay, returnTo: document.activeElement });
    overlay.classList.add("open");
    overlay.removeAttribute("aria-hidden");
    var target = focusTarget || overlay.querySelector(FOCUSABLE);
    if (target) setTimeout(function () { target.focus(); }, 30);
  }

  function closeDialog(overlay) {
    var idx = -1;
    dialogs.forEach(function (d, i) { if (d.overlay === overlay) idx = i; });
    if (idx === -1) return;
    var entry = dialogs.splice(idx, 1)[0];
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    if (entry.returnTo && entry.returnTo.focus && document.contains(entry.returnTo)) entry.returnTo.focus();
  }

  document.addEventListener("keydown", function (e) {
    var top = dialogs[dialogs.length - 1];
    if (!top) return;
    var overlay = top.overlay;
    if (e.key === "Escape") {
      e.preventDefault();
      closeDialog(overlay);
    } else if (e.key === "Tab") {
      var items = Array.prototype.slice.call(overlay.querySelectorAll(FOCUSABLE));
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!overlay.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
  });

  function wireDialog(overlayId, closeId) {
    var overlay = $(overlayId);
    $(closeId).addEventListener("click", function () { closeDialog(overlay); });
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeDialog(overlay); });
  }
  wireDialog("legalOverlay", "legalClose");
  wireDialog("boxOverlay", "boxClose");
  wireDialog("shareOverlay", "closeModalBtn");
  $("legalLink").addEventListener("click", function () { openDialog($("legalOverlay")); });

  // ── Keepsake box: letters kept in this browser ────────
  var BOX_KEY = "tellme.box";

  function loadBox() {
    var list = store.get(BOX_KEY, []);
    return Array.isArray(list) ? list.filter(function (x) { return x && typeof x.text === "string"; }) : [];
  }
  function saveBox(list) { return store.set(BOX_KEY, list.slice(0, 200)); }
  function findKept(text) {
    var list = loadBox();
    for (var i = 0; i < list.length; i++) if (list[i].text === text) return list[i];
    return null;
  }

  function updateBoxCount() {
    var n = loadBox().length;
    $("boxCount").textContent = n ? String(n) : "";
    $("boxBtn").setAttribute("aria-label", n ? "My letters, " + n + " kept" : "My letters");
  }

  function updateKeepButton() {
    var kept = !!(currentMessage && findKept(currentMessage));
    var btn = $("keepBtn");
    btn.classList.toggle("kept", kept);
    btn.setAttribute("aria-pressed", kept ? "true" : "false");
    $("keepLabel").textContent = kept ? "Kept" : "Keep this letter";
  }

  $("keepBtn").addEventListener("click", function () {
    if (!currentMessage) return;
    var list = loadBox();
    var existing = findKept(currentMessage);
    if (existing) {
      list = list.filter(function (x) { return x.id !== existing.id; });
      saveBox(list);
      showToast("Removed from your letters");
    } else {
      list.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        text: currentMessage,
        need: currentNeed,
        salutation: salutation(),
        date: new Date().toISOString()
      });
      if (!saveBox(list)) { showToast("This browser doesn't allow saving letters"); return; }
      showToast("Kept in your letters ♡");
    }
    updateKeepButton();
    updateBoxCount();
  });

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
    } catch (e) { return ""; }
  }

  function renderBox() {
    var list = loadBox();
    var ul = $("boxList");
    ul.textContent = "";
    $("boxEmpty").hidden = list.length > 0;

    list.forEach(function (item) {
      var li = document.createElement("li");
      li.className = "box-item";

      var meta = document.createElement("div");
      meta.className = "box-meta";
      meta.textContent = [formatDate(item.date), needLabels[item.need] ? "about " + needLabels[item.need] : ""]
        .filter(Boolean).join(" · ");

      var text = document.createElement("p");
      text.className = "box-text";
      text.textContent = item.text;

      var actions = document.createElement("div");
      actions.className = "box-actions";

      var shareB = document.createElement("button");
      shareB.type = "button";
      shareB.textContent = "Share as image";
      shareB.addEventListener("click", function () { shareCard(item.text, item.salutation || "My dear,"); });

      var removeB = document.createElement("button");
      removeB.type = "button";
      removeB.textContent = "Remove";
      var armed = null;
      removeB.addEventListener("click", function () {
        if (!armed) {
          removeB.textContent = "Remove? Tap again";
          armed = setTimeout(function () { armed = null; removeB.textContent = "Remove"; }, 3000);
          return;
        }
        clearTimeout(armed);
        saveBox(loadBox().filter(function (x) { return x.id !== item.id; }));
        updateBoxCount();
        updateKeepButton();
        renderBox();
        var closeBtn = $("boxClose");
        if (closeBtn) closeBtn.focus();
      });

      actions.appendChild(shareB);
      actions.appendChild(removeB);
      li.appendChild(meta);
      li.appendChild(text);
      li.appendChild(actions);
      ul.appendChild(li);
    });
  }

  $("boxBtn").addEventListener("click", function () {
    renderBox();
    openDialog($("boxOverlay"));
  });

  // ── Share card (1080×1920, Stories format) ────────────
  var share = { url: null, file: null };
  var CARD_SERIF = "'Cormorant Garamond', Georgia, serif";
  var CARD_SANS = "'Instrument Sans', Helvetica, Arial, sans-serif";

  function loadCardFonts(text) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var sample = (text || "") + " My dear, With all my love, Mom";
    return Promise.all([
      document.fonts.load("300 72px 'Cormorant Garamond'", sample),
      document.fonts.load("italic 300 44px 'Cormorant Garamond'", sample),
      document.fonts.load("400 26px 'Instrument Sans'", "A MESSAGE FROM MOM tellme.mom")
    ]).catch(function () {});
  }

  function drawCard(message, greeting) {
    var W = 1080, H = 1920;
    var canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d");

    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#FDF6EE");
    bg.addColorStop(0.5, "#F8EDE0");
    bg.addColorStop(1, "#F2E4D0");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    function glow(x, y, r, color) {
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, "rgba(253,246,238,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    glow(W * 0.15, H * 0.1, 700, "rgba(196,120,90,0.09)");
    glow(W * 0.85, H * 0.9, 800, "rgba(196,120,90,0.07)");
    glow(W * 0.5, H * 0.5, 1000, "rgba(245,230,210,0.25)");

    function line(x1, y1, x2, y2, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    var PAD = 120;
    var MID_TOP = 260;
    var MID_BOT = H - 260;
    var MID_H = MID_BOT - MID_TOP;
    var maxW = W - PAD * 2;

    ctx.font = "400 26px " + CARD_SANS;
    ctx.fillStyle = "rgba(126,107,85,0.85)";
    ctx.textAlign = "center";
    if ("letterSpacing" in ctx) ctx.letterSpacing = "6px";
    ctx.fillText("A MESSAGE FROM MOM", W / 2, 110);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    line(W / 2 - 100, 136, W / 2 + 100, 136, "rgba(196,120,90,0.25)");

    ctx.font = "italic 300 46px " + CARD_SERIF;
    ctx.fillStyle = "rgba(126,107,85,0.9)";
    ctx.textAlign = "left";
    ctx.fillText(greeting || "My dear,", PAD, 210);
    line(PAD, 232, W - PAD, 232, "rgba(196,120,90,0.15)");

    // Wrap text, keeping paragraph breaks.
    function wrap(size) {
      ctx.font = "300 " + size + "px " + CARD_SERIF;
      var out = [];
      String(message).split(/\n+/).forEach(function (para, pi) {
        if (pi > 0) out.push("");
        var words = para.trim().split(/\s+/);
        var ln = "";
        for (var i = 0; i < words.length; i++) {
          var test = ln ? ln + " " + words[i] : words[i];
          if (ctx.measureText(test).width > maxW && ln) {
            out.push(ln);
            ln = words[i];
          } else {
            ln = test;
          }
        }
        if (ln) out.push(ln);
      });
      return out;
    }

    var fontSize = 46, lines = null, lineH = 0;
    for (var fs = 84; fs >= 46; fs -= 2) {
      var candidate = wrap(fs);
      var lh = fs * 1.42;
      if (candidate.length * lh <= MID_H - 80) {
        fontSize = fs; lines = candidate; lineH = lh;
        break;
      }
    }
    if (!lines) { lines = wrap(46); lineH = 46 * 1.42; }

    var startY = MID_TOP + (MID_H - lines.length * lineH) / 2 + fontSize * 0.8;
    ctx.font = "300 " + fontSize + "px " + CARD_SERIF;
    ctx.fillStyle = "#2C2318";
    ctx.textAlign = "left";
    for (var j = 0; j < lines.length; j++) {
      if (lines[j]) ctx.fillText(lines[j], PAD, startY + j * lineH);
    }

    line(PAD, MID_BOT + 20, W - PAD, MID_BOT + 20, "rgba(196,120,90,0.15)");
    ctx.font = "italic 300 46px " + CARD_SERIF;
    ctx.fillStyle = "rgba(126,107,85,0.9)";
    ctx.textAlign = "right";
    ctx.fillText("With all my love, Mom", W - PAD, MID_BOT + 70);

    ctx.font = "400 32px " + CARD_SANS;
    ctx.fillStyle = "rgba(166,93,65,0.8)";
    ctx.textAlign = "center";
    ctx.fillText("tellme.mom", W / 2, H - 100);

    return canvas;
  }

  function canShareFiles(file) {
    try {
      return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [file] }));
    } catch (e) { return false; }
  }

  function shareCard(message, greeting) {
    if (!message) return;
    loadCardFonts(message + " " + greeting).then(function () {
      var canvas = drawCard(message, greeting);
      canvas.toBlob(function (blob) {
        if (!blob) { showToast("Couldn't create the image"); return; }
        if (share.url) URL.revokeObjectURL(share.url);
        share.url = URL.createObjectURL(blob);
        share.file = null;
        try { share.file = new File([blob], "tellme-mom-letter.png", { type: "image/png" }); } catch (e) {}

        $("sharePreview").src = share.url;

        var nativeOk = share.file && canShareFiles(share.file);
        var nativeBtn = $("nativeShareBtn");
        var dlBtn = $("downloadBtn");
        nativeBtn.hidden = !nativeOk;
        dlBtn.className = nativeOk ? "btn-close-modal" : "btn-download";
        $("shareHint").textContent = nativeOk
          ? "Share straight to Instagram, Telegram or Messages, or save it"
          : "Save the image to share on Instagram & Stories";

        openDialog($("shareOverlay"), nativeOk ? nativeBtn : dlBtn);
      }, "image/png");
    });
  }

  $("shareBtn").addEventListener("click", function () {
    shareCard(currentMessage, $("letterSalutation").textContent);
  });

  $("nativeShareBtn").addEventListener("click", function () {
    if (!share.file) return;
    navigator.share({ files: [share.file], title: "A letter from mom", text: "tellme.mom" })
      .catch(function (err) {
        if (err && err.name === "AbortError") return; // user closed the share sheet
        showToast("Couldn't open sharing. Try Save image");
      });
  });

  $("downloadBtn").addEventListener("click", function () {
    if (!share.url) return;
    var link = document.createElement("a");
    link.download = "tellme-mom-letter.png";
    link.href = share.url;
    document.body.appendChild(link);
    link.click();
    link.remove();
  });

  // ── Deep links ────────────────────────────────────────
  // /?need=pride preselects a theme (never auto-generates, so crawlers cost nothing).
  // /#terms opens Terms & Privacy.
  (function () {
    var params = new URLSearchParams(location.search);
    var need = params.get("need");
    var chip = need && chips.filter(function (c) { return c.getAttribute("data-need") === need; })[0];
    if (chip) {
      if (chip.closest("#situationsGrid")) setSituationsOpen(true);
      selectChip(chip);
      setTimeout(function () { $("receiveBtn").focus({ preventScroll: true }); }, 50);
    }
    if (location.search) history.replaceState(null, "", location.pathname + location.hash);
    if (location.hash === "#terms") openDialog($("legalOverlay"));
    window.addEventListener("hashchange", function () {
      if (location.hash === "#terms") openDialog($("legalOverlay"));
    });
  })();

  updateBoxCount();
})();
