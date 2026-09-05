// Import Firnline (mVara's first-person ski prototype, its own repository) into this site at
// /firnline/ WITHOUT touching its source tree. The game expects the domain root: its README says
// "a project subpath requires changes to those paths as well as Vite's base setting". So: build it
// with --base=/firnline/ into public/firnline/, then rewrite the few absolute "/assets/" strings its
// JavaScript still carries, add the page's search metadata to the built index.html, and write a
// PROVENANCE file naming the commit that was built. Re-runnable: npm run import:firnline [path]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const src = resolve(process.argv[2] || join(process.env.HOME, 'Dev/firnline'));
const out = resolve('public/firnline');
if (!existsSync(join(src, 'package.json'))) throw new Error(`no Firnline at ${src}`);

const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: src }).toString().trim();
const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: src }).toString().trim();
if (dirty) console.warn('WARNING: the Firnline tree has uncommitted changes; the build will include them.');

console.log(`Firnline ${sha.slice(0, 7)} → ${out}`);
execFileSync('npm', ['test'], { cwd: src, stdio: 'inherit' });
execFileSync('npx', ['vite', 'build', '--base=/firnline/', '--outDir', out, '--emptyOutDir'], { cwd: src, stdio: 'inherit' });

// The JavaScript loads "/assets/…" by literal string; move those under the subpath. Vite has already
// rewritten the HTML and CSS references, so only the still-bare form is touched.
let rewritten = 0;
for (const f of readdirSync(join(out, 'assets'))) {
  if (!/\.(js|css)$/.test(f)) continue;
  const p = join(out, 'assets', f);
  const before = readFileSync(p, 'utf8');
  const after = before.replace(/(["'`(])\/assets\//g, '$1/firnline/assets/');
  if (after !== before) { writeFileSync(p, after); rewritten += (before.match(/(["'`(])\/assets\//g) || []).length; }
}
console.log(`rewrote ${rewritten} bare /assets/ references`);

// Search metadata for the built page: canonical at this address, a share card, VideoGame data.
const site = 'https://agentdoor.ai';
const head = `
<link rel="canonical" href="${site}/firnline/"/>
<link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"/>
<link rel="manifest" href="/manifest.webmanifest"/>
<meta name="mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-title" content="Firnline"/>
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
<meta property="og:site_name" content="AgentDoor"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="Firnline — Find your fall line"/>
<meta property="og:description" content="A first-person alpine skiing game in the browser. One mountain, as far as you can go. Carve to control your speed; find a line through rocks and trees. Free, nothing to install."/>
<meta property="og:url" content="${site}/firnline/"/>
<meta property="og:image" content="${site}/og/firnline.jpg"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:image" content="${site}/og/firnline.jpg"/>
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org', '@type': 'VideoGame', '@id': `${site}/firnline/#game`,
  name: 'Firnline', url: `${site}/firnline/`,
  description: 'A first-person alpine skiing game in the browser. One continuous run with distance as the score: carve to control your speed and find a line through rocks and trees on a run that bends and narrows as you descend.',
  image: `${site}/og/firnline.jpg`, genre: ['Sports', 'Skiing', 'Simulation'], gamePlatform: 'Web browser', playMode: 'SinglePlayer',
  applicationCategory: 'Game', operatingSystem: 'Any modern browser with WebGL 2', inLanguage: 'en', isAccessibleForFree: true,
  author: { '@type': 'Organization', name: 'mVara', url: 'https://mvara.ai' }, publisher: { '@id': `${site}/#organization` },
})}</script>
`;
const indexPath = join(out, 'index.html');
let html = readFileSync(indexPath, 'utf8');
html = html.replace(/<meta\s+name="description"[^>]*>/, (m) => m.replace(/content="[^"]*"/, 'content="Find your fall line. A first-person alpine skiing game in the browser: one mountain, as far as you can go. Free, nothing to install, from mVara."'));
html = html.replace('</head>', `${head}</head>`);
writeFileSync(indexPath, html);

let bytes = 0, files = 0;
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); const s = statSync(p); if (s.isDirectory()) walk(p); else { files++; bytes += s.size; } } };
walk(out);
writeFileSync(join(out, 'PROVENANCE.txt'), `Firnline, built from ${src} at commit ${sha}${dirty ? ' (with uncommitted changes)' : ''} on ${new Date().toISOString()}
by scripts/import-firnline.mjs: vite build --base=/firnline/, bare "/assets/" strings rewritten (${rewritten}), search metadata added to index.html.
${files} files, ${(bytes / 1048576).toFixed(1)} MB. Assets: Poly Haven (CC0) and Barlow (OFL) — see assets/credits.json and assets/OFL.txt.
`);
console.log(`${files} files, ${(bytes / 1048576).toFixed(1)} MB; PROVENANCE written`);
