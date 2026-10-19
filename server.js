const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = (process.env.BASE_URL || '').replace(/\/$/, '');
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], imgSrc: ["'self'", 'data:', 'https:'], mediaSrc: ["'self'", 'blob:', 'https:'], connectSrc: ["'self'"], objectSrc: ["'none'"], upgradeInsecureRequests: null }}}));
app.use(express.json({ limit: '8kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(rateLimit({ windowMs: 60_000, limit: 12, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many requests. Please wait a minute and try again.' }}));
const jobs = new Map();
const cleanup = (dir) => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} };
function validateInstagramUrl(input) {
  let u;
  try { u = new URL(String(input || '').trim()); } catch { return null; }
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (!['instagram.com', 'm.instagram.com'].includes(host)) return null;
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.username || u.password || u.port) return null;
  if (!/^\/(reel|reels|p|tv)\/[A-Za-z0-9_-]+\/?$/.test(u.pathname)) return null;
  return `https://www.instagram.com${u.pathname}`;
}
function runYtDlp(args, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    const child = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PYTHONUNBUFFERED: '1' } });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => { stdout += d.toString(); if (stdout.length > 1_000_000) child.kill('SIGKILL'); });
    child.stderr.on('data', d => { stderr += d.toString(); if (stderr.length > 30_000) stderr = stderr.slice(-30_000); });
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.on('error', e => { clearTimeout(timer); reject(e); });
    child.on('close', code => { clearTimeout(timer); if (code === 0) resolve(stdout.trim()); else reject(new Error(stderr || `media retrieval exited with code ${code}`)); });
  });
}
function safeMessage(err) {
  const s = String(err.message || '').toLowerCase();
  if (s.includes('private') || s.includes('login') || s.includes('sign in') || s.includes('authentication')) return 'This content cannot be accessed through the supported retrieval method. Private or restricted content is not supported.';
  if (s.includes('not available') || s.includes('deleted') || s.includes('unavailable')) return 'The requested video could not be retrieved. It may be unavailable or restricted.';
  if (s.includes('enoent')) return 'The media retrieval tool is not installed on this server. Check the deployment setup.';
  return 'The requested video could not be retrieved. Instagram may have restricted access, or the link may be unsupported. Please try again later.';
}
app.post('/api/analyze', async (req, res) => {
  const url = validateInstagramUrl(req.body?.url);
  if (!url) return res.status(400).json({ error: 'Please enter a valid, supported Instagram link.' });
  try {
    const raw = await runYtDlp(['--no-warnings','--no-playlist','--skip-download','--dump-single-json','--socket-timeout','15','--retries','1',url], 45000);
    const info = JSON.parse(raw);
    const submittedCode = url.match(/\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/)?.[1];
    const returnedUrl = String(info.webpage_url || info.original_url || '');
    const returnedCode = returnedUrl.match(/\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/)?.[1];
    if (!info || !info.id || !submittedCode || (returnedCode && returnedCode !== submittedCode)) return res.status(422).json({ error: 'We could not verify that the retrieved media matches your link. Download has been disabled.' });
    const formats = (info.formats || []).filter(f => f.url && (f.vcodec && f.vcodec !== 'none'));
    const best = formats.sort((a,b) => (Number(b.height)||0) - (Number(a.height)||0))[0];
    if (!best && !info.url) return res.status(422).json({ error: 'The requested video could not be retrieved.' });
    const id = crypto.randomBytes(18).toString('hex');
    jobs.set(id, { url, code: submittedCode, title: String(info.title || 'instagram-video').slice(0,160), formats, directUrl: best?.url || info.url, height: best?.height || info.height || null, expires: Date.now() + 5 * 60_000 });
    res.json({ id, title: String(info.title || 'Instagram video').slice(0,160), thumbnail: /^https:\/\//.test(info.thumbnail || '') ? info.thumbnail : null, duration: Number(info.duration) || null, height: best?.height || info.height || null, verified: true, message: 'Media details retrieved and the post code checked. Download availability depends on Instagram access.' });
  } catch (err) { console.error('Analyze failed:', String(err.message || err).slice(0,500)); res.status(502).json({ error: safeMessage(err) }); }
});
app.get('/api/download/:id', async (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job || job.expires < Date.now()) { jobs.delete(req.params.id); return res.status(404).json({ error: 'This analysis has expired. Please analyze the Instagram link again.' }); }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'igdl-'));
  const out = path.join(dir, 'video.%(ext)s');
  try {
    // Re-fetch only from the validated Instagram URL; do not trust client-supplied media URLs.
    const verifyRaw = await runYtDlp(['--no-warnings','--no-playlist','--skip-download','--dump-single-json','--socket-timeout','15','--retries','1',job.url], 45000);
    const verify = JSON.parse(verifyRaw);
    if (String(verify.id) !== job.code) return res.status(422).json({ error: 'We could not verify that the retrieved media matches your link. Download has been disabled.' });
    await runYtDlp(['--no-warnings','--no-playlist','--format','best[ext=mp4]/best','--max-filesize','300M','--socket-timeout','20','--retries','1','--output',out,job.url], 120000);
    const files = fs.readdirSync(dir).filter(f => /^video\.(mp4|webm|mkv|mov)$/i.test(f));
    if (!files.length) throw new Error('video unavailable');
    const file = path.join(dir, files[0]);
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size < 1024 || stat.size > 300 * 1024 * 1024) throw new Error('invalid media size');
    const ext = path.extname(file).toLowerCase();
    res.setHeader('Content-Type', ext === '.mp4' ? 'video/mp4' : 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="instagram-video-${job.code}${ext}"`);
    res.setHeader('Content-Length', stat.size);
    const stream = fs.createReadStream(file);
    stream.on('error', () => { if (!res.headersSent) res.status(500).end('Download failed'); cleanup(dir); });
    res.on('finish', () => cleanup(dir)); res.on('close', () => cleanup(dir)); stream.pipe(res);
  } catch (err) { cleanup(dir); console.error('Download failed:', String(err.message || err).slice(0,500)); if (!res.headersSent) res.status(502).json({ error: safeMessage(err) }); }
});
app.get('/robots.txt', (_req,res) => { res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${BASE_URL || 'https://YOUR-DOMAIN.example'}/sitemap.xml\n`); });
app.get('/sitemap.xml', (_req,res) => { const base = BASE_URL || 'https://YOUR-DOMAIN.example'; res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${base}/</loc></url><url><loc>${base}/privacy.html</loc></url><url><loc>${base}/terms.html</loc></url><url><loc>${base}/keyword-guide.html</loc></url></urlset>`); });
app.get('/health', (_req,res) => res.json({ ok: true }));
app.listen(PORT, () => console.log(`Instagram Video Downloader listening on ${PORT}`));
