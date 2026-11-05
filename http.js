function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return {};
}

function fail(res, e) {
  if (e && e.status) return send(res, e.status, { error: e.message });
  console.error(e);
  return send(res, 500, { error: 'Something went wrong on the server. Try again.' });
}

module.exports = { send, readBody, fail };
