// Shared by every page: night mode, offline support (service worker), install prompt.
// Loaded in <head> without defer so the theme is applied before the first paint.
(function () {
  'use strict';

  var KEY = 'tellme.theme'; // 'light' | 'dark' | absent (= automatic)
  var root = document.documentElement;

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function store(value) {
    try {
      if (value) localStorage.setItem(KEY, value);
      else localStorage.removeItem(KEY);
    } catch (e) { /* private mode: the choice lasts for this page only */ }
  }

  // Automatic: follow the system, and also turn dark late at night (22:00–06:00),
  // when many people come here.
  function automatic() {
    var h = new Date().getHours();
    var night = h >= 22 || h < 6;
    var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return systemDark || night ? 'dark' : 'light';
  }

  function current() { return stored() || automatic(); }

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#17110D' : '#FDF8F3');
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      var dark = theme === 'dark';
      buttons[i].setAttribute('aria-pressed', dark ? 'true' : 'false');
      buttons[i].setAttribute('aria-label', dark ? 'Switch to day mode' : 'Switch to night mode');
      buttons[i].setAttribute('title', dark ? 'Day mode' : 'Night mode');
    }
  }

  apply(current());

  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function () { if (!stored()) apply(automatic()); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  window.tellmeTheme = {
    current: current,
    toggle: function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      // Choosing what the automatic mode would pick anyway returns to automatic.
      store(next === automatic() ? null : next);
      apply(next);
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    apply(current());
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-theme-toggle]');
      if (btn) window.tellmeTheme.toggle();
    });

    // "Install app" link appears only where the browser offers installation.
    var installLinks = document.querySelectorAll('[data-install]');
    var deferred = null;
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferred = e;
      for (var i = 0; i < installLinks.length; i++) installLinks[i].hidden = false;
    });
    window.addEventListener('appinstalled', function () {
      for (var i = 0; i < installLinks.length; i++) installLinks[i].hidden = true;
    });
    for (var i = 0; i < installLinks.length; i++) {
      installLinks[i].addEventListener('click', function () {
        if (!deferred) return;
        deferred.prompt();
        deferred = null;
        for (var j = 0; j < installLinks.length; j++) installLinks[j].hidden = true;
      });
    }
  });

  // Offline support. Only on the real site / localhost, never inside other frames.
  if ('serviceWorker' in navigator && window.top === window.self &&
      (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }
})();
