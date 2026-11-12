// Public, non-secret settings for the browser.
// The Turnstile *site* key is public by design; the secret key never leaves the server.
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  return res.status(200).json({
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || null
  });
}
