const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const authRouter = require('./routes/auth');
const { checkDatabaseConnection } = require('./services/dbHealth');
const { version } = require('../package.json');

const app = express();
app.use(express.json());
app.use(cookieParser());

// Walks the Express router stack and collects the registered routes as
// { method, path } entries. Handles both app-level routes and routes mounted
// via sub-routers (e.g. the auth router), prefixing the latter with their
// mount path.
function listRoutes(application) {
  const routes = [];

  const collect = (stack, prefix) => {
    for (const layer of stack) {
      if (layer.route) {
        const path = `${prefix}${layer.route.path}`;
        for (const method of Object.keys(layer.route.methods)) {
          if (layer.route.methods[method]) {
            routes.push({ method: method.toUpperCase(), path });
          }
        }
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        collect(layer.handle.stack, prefix);
      }
    }
  };

  collect(application._router.stack, '');

  routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
  return routes;
}

app.get('/health', async (_req, res) => {
  const db = await checkDatabaseConnection();
  res.status(db.connected ? 200 : 503).json({
    status: db.connected ? 'ok' : 'degraded',
    uptime: process.uptime(),
    database: db,
  });
});

app.get('/status', (_req, res) => res.json({ status: 'ok' }));

app.get('/version', (_req, res) => res.json({ version }));

app.get('/ping', (_req, res) => res.json({ ping: 1, timestamp: new Date().toISOString() }));

app.get('/ready', (_req, res) => res.type('text/plain').send('je suis prêt'));

app.get('/time', (_req, res) => res.json({ time: new Date().toISOString() }));

app.get('/uuid', (_req, res) => res.json({ uuid: crypto.randomUUID(), version }));

app.get('/routes', (_req, res) => res.json({ routes: listRoutes(app) }));

app.get('/elfe', (_req, res) => res.status(200).json({ status: 'ok' }));

// Echoes back the caller-supplied text as-is. Reads `text` from the query
// string (GET) or the JSON body (POST); missing input echoes an empty string.
function echoHandler(req, res) {
  const text = req.method === 'POST' ? req.body && req.body.text : req.query.text;
  res.json({ text: text == null ? '' : String(text) });
}

app.get('/echo', echoHandler);
app.post('/echo', echoHandler);

// Reverses the caller-supplied text query param; missing input reverses an
// empty string. Reads `texte` (preferred) or falls back to `text`. Uses
// Array.from so multi-byte characters (emoji, accents) are reversed by code
// point rather than by UTF-16 unit. When the input is a non-empty run of
// digits, the response also carries their `sum`.
app.get('/reverse', (req, res) => {
  const raw = req.query.texte == null ? req.query.text : req.query.texte;
  const text = raw == null ? '' : String(raw);
  const reversed = Array.from(text).reverse().join('');
  const body = { reversed };
  if (/^\d+$/.test(text)) {
    body.sum = Array.from(text).reduce((acc, d) => acc + Number(d), 0);
  }
  res.json(body);
});

// Slugifies the caller-supplied `text` query param and returns the slug along
// with its length (code-point count). Normalizes accents away, lowercases,
// and collapses any run of non-alphanumeric characters into single hyphens,
// trimming leading/trailing hyphens. Missing input yields an empty slug.
app.get('/slug', (req, res) => {
  const text = req.query.text == null ? '' : String(req.query.text);
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  res.json({ slug, length: Array.from(slug).length });
});

// Encodes the caller-supplied `text` query param to base64 (UTF-8 bytes) and
// returns the encoded string; missing input encodes an empty string.
app.get('/base64', (req, res) => {
  const text = req.query.text == null ? '' : String(req.query.text);
  res.json({ base64: Buffer.from(text, 'utf8').toString('base64') });
});

// Uppercases the caller-supplied `text` query param and returns it; missing
// input uppercases an empty string.
app.get('/upper', (req, res) => {
  const text = req.query.text == null ? '' : String(req.query.text);
  res.json({ upper: text.toUpperCase() });
});

// Returns the number of characters (code points) in the `text` query param;
// missing input counts an empty string (0).
app.get('/compte', (req, res) => {
  const text = req.query.text == null ? '' : String(req.query.text);
  res.json({ text, length: Array.from(text).length });
});

// Returns the number of characters (code points) in the `:id` path param.
app.get('/compte/:id', (req, res) => {
  const id = String(req.params.id);
  res.json({ id, length: Array.from(id).length });
});

// Reports whether the caller-supplied `mot` query param is a palindrome.
// Uses Array.from so multi-byte characters (emoji, accents) are compared by
// code point rather than by UTF-16 unit. Missing input is treated as an empty
// string, which counts as a palindrome.
app.get('/palindrome', (req, res) => {
  const mot = req.query.mot == null ? '' : String(req.query.mot);
  const chars = Array.from(mot);
  const isPalindrome = chars.join('') === chars.reverse().join('');
  res.json({ mot, isPalindrome });
});

// Reports whether the two caller-supplied words `a` and `b` are anagrams of
// each other. Comparison is case-insensitive, strips accents, and ignores
// non-alphanumeric characters (spaces, punctuation). Sorts the remaining
// code points and compares. Two missing/empty inputs count as anagrams.
function normalizeForAnagram(raw) {
  const text = raw == null ? '' : String(raw);
  return Array.from(
    text
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ''),
  )
    .sort()
    .join('');
}

app.get('/anagramme', (req, res) => {
  const a = req.query.a == null ? '' : String(req.query.a);
  const b = req.query.b == null ? '' : String(req.query.b);
  const isAnagram = normalizeForAnagram(a) === normalizeForAnagram(b);
  res.json({ a, b, isAnagram });
});

// Computes the factorial of the caller-supplied `n` query param and returns it.
// `n` must be a non-negative integer; anything else yields a 400. The result is
// computed with BigInt to stay exact for large inputs and serialized as a
// string so it survives JSON (which cannot represent BigInt or precise large
// numbers). `n` is capped at 10000 to bound compute time.
app.get('/factorielle', (req, res) => {
  const raw = req.query.n;
  if (raw == null || !/^\d+$/.test(String(raw))) {
    return res.status(400).json({ error: 'invalid_input' });
  }
  const n = Number(raw);
  if (n > 10000) {
    return res.status(400).json({ error: 'out_of_range' });
  }
  let result = 1n;
  for (let i = 2n; i <= BigInt(n); i += 1n) {
    result *= i;
  }
  return res.json({ n, factorielle: result.toString() });
});

// Converts the caller-supplied `f` (Fahrenheit) query param to Celsius and
// returns both values. `f` must parse as a finite number; anything else yields
// a 400.
app.get('/celsius', (req, res) => {
  const raw = req.query.f;
  const f = Number(raw);
  if (raw == null || raw === '' || !Number.isFinite(f)) {
    return res.status(400).json({ error: 'invalid_input' });
  }
  const celsius = (f - 32) * (5 / 9);
  return res.json({ fahrenheit: f, celsius });
});

// Counts the number of whitespace-separated words in the `text` query param
// and returns the count. Leading/trailing whitespace is ignored; missing or
// empty input yields 0.
app.get('/wordCount', (req, res) => {
  const text = req.query.text == null ? '' : String(req.query.text);
  const trimmed = text.trim();
  const count = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
  res.json({ text, count });
});

app.use('/', authRouter);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Listening on ${PORT}`));
}

module.exports = app;
