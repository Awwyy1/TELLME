// Builds the static theme pages, the /letters hub and sitemap.xml.
// Usage: node scripts/build-pages.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { themes, hub } from './pages-content.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const SITE = 'https://www.tellme.mom';
const HELPLINE = 'https://findahelpline.com';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const heart = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

function head({ title, description, url, jsonLd }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="theme-color" content="#FDF8F3">
  <link rel="canonical" href="${url}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="${SITE}/og-image.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${SITE}/og-image.jpg">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <link rel="preload" href="/fonts/CormorantGaramond-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/InstrumentSans-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/pages.css">
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <script src="/site.js"></script>
  <script defer src="/_vercel/insights/script.js"></script>
</head>`;
}

const header = `
  <header class="site-header">
    <a class="logo" href="/">tellme<span>.mom</span></a>
    <div class="header-right">
      <a class="header-link" href="/letters">All letters</a>
      <button type="button" class="theme-toggle" data-theme-toggle aria-pressed="false" aria-label="Switch to night mode" title="Night mode">
        <svg class="sun" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
        <svg class="moon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
    </div>
  </header>`;

const footer = `
  <footer class="site-footer">
    <span>tellme.mom — for those who needed to hear it</span>
    <a class="footer-help" href="${HELPLINE}" target="_blank" rel="noopener">Having a hard time? Find a helpline</a>
    <a href="/#terms">Terms &amp; Privacy</a>
    <button type="button" class="link-btn" data-install hidden>Install app</button>
  </footer>`;

function breadcrumbs(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url }))
  };
}

function themePage(t) {
  const url = `${SITE}/${t.slug}`;
  const title = `${t.title} — letters from mom | tellme.mom`;
  const others = themes.filter((o) => o.slug !== t.slug);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: title, url, description: t.description, inLanguage: 'en',
        isPartOf: { '@type': 'WebSite', name: 'tellme.mom', url: SITE } },
      breadcrumbs([
        { name: 'tellme.mom', url: SITE },
        { name: 'Letters', url: `${SITE}/letters` },
        { name: t.title, url }
      ])
    ]
  };

  return `${head({ title, description: t.description, url, jsonLd })}
<body>${header}

  <main class="page">
    <nav class="crumbs" aria-label="Breadcrumb">
      <a href="/">tellme.mom</a><span aria-hidden="true">/</span><a href="/letters">Letters</a><span aria-hidden="true">/</span><span aria-current="page">${esc(t.title)}</span>
    </nav>

    <p class="eyebrow">Letters from mom</p>
    <h1 class="headline">${esc(t.title)}</h1>
    <div class="lede">
${t.intro.map((p) => `      <p>${esc(p)}</p>`).join('\n')}
    </div>
    <a class="btn" href="/?need=${t.need}">${heart}Receive your own letter</a>

    <section class="letters" aria-labelledby="letters-title">
      <h2 class="section-title" id="letters-title">Letters to read slowly</h2>
${t.letters.map((l) => `      <article class="letter">
        <span class="letter-salutation">My dear,</span>
        <p class="letter-body">${esc(l)}</p>
        <span class="letter-closing">With all my love, Mom</span>
      </article>`).join('\n')}
    </section>

    <section class="cta">
      <p>Every letter on tellme.mom can be written fresh, just for the moment you're in.</p>
      <a class="btn" href="/?need=${t.need}">${heart}Receive a letter about ${esc(t.label)}</a>
    </section>

    <section class="more" aria-labelledby="more-title">
      <h2 class="section-title" id="more-title">Other words you might need</h2>
      <ul class="chips">
${others.map((o) => `        <li><a class="chip" href="/${o.slug}">${esc(o.title)}</a></li>`).join('\n')}
      </ul>
    </section>

    <p class="disclaimer">These letters were written with the help of AI and chosen with care. They offer comfort, not therapy. If you're struggling, please <a href="${HELPLINE}" target="_blank" rel="noopener">find a helpline</a> or talk to someone you trust.</p>
  </main>
${footer}
</body>
</html>
`;
}

function hubPage() {
  const url = `${SITE}/${hub.slug}`;
  const title = `${hub.title} — the words your mom never said | tellme.mom`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', name: title, url, description: hub.description, inLanguage: 'en',
        hasPart: themes.map((t) => ({ '@type': 'WebPage', name: t.title, url: `${SITE}/${t.slug}` })) },
      breadcrumbs([{ name: 'tellme.mom', url: SITE }, { name: 'Letters', url }])
    ]
  };
  const firstSentence = (s) => (s.match(/^.*?[.!?](\s|$)/) || [s])[0].trim();

  return `${head({ title, description: hub.description, url, jsonLd })}
<body>${header}

  <main class="page">
    <nav class="crumbs" aria-label="Breadcrumb">
      <a href="/">tellme.mom</a><span aria-hidden="true">/</span><span aria-current="page">Letters</span>
    </nav>

    <p class="eyebrow">For every child who needed to hear it</p>
    <h1 class="headline">${esc(hub.title)}</h1>
    <div class="lede">
${hub.intro.map((p) => `      <p>${esc(p)}</p>`).join('\n')}
    </div>

    <ul class="theme-grid">
${themes.map((t) => `      <li>
        <a class="theme-card" href="/${t.slug}">
          <span class="theme-title">${esc(t.title)}</span>
          <span class="theme-excerpt">“${esc(firstSentence(t.letters[0]))}”</span>
          <span class="theme-more">Read the letters →</span>
        </a>
      </li>`).join('\n')}
    </ul>

    <section class="cta">
      <p>Not sure what you need today? Let a letter find you.</p>
      <a class="btn" href="/?need=surprise">${heart}Whatever I need most</a>
    </section>

    <p class="disclaimer">These letters were written with the help of AI and chosen with care. They offer comfort, not therapy. If you're struggling, please <a href="${HELPLINE}" target="_blank" rel="noopener">find a helpline</a> or talk to someone you trust.</p>
  </main>
${footer}
</body>
</html>
`;
}

function sitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: SITE, priority: '1.0' },
    { loc: `${SITE}/letters`, priority: '0.8' },
    ...themes.map((t) => ({ loc: `${SITE}/${t.slug}`, priority: '0.7' }))
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
}

fs.writeFileSync(path.join(PUBLIC, 'letters.html'), hubPage());
for (const t of themes) fs.writeFileSync(path.join(PUBLIC, `${t.slug}.html`), themePage(t));
fs.writeFileSync(path.join(PUBLIC, 'sitemap.xml'), sitemap());

console.log(`Built /letters, ${themes.length} theme pages and sitemap.xml`);
console.log('Routes for vercel.json:', ['letters', ...themes.map((t) => t.slug)].join('|'));
