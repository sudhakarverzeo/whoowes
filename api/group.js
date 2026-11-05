// GET  /api/group?id=xyz        -> the group
// POST /api/group {id, op}      -> apply one change, returns the updated group
const store = require('./_db');
const L = require('./_logic');
const { send, readBody, fail } = require('./_http');

const notFound = { error: 'This group does not exist.' };

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const id = String((req.query && req.query.id) || '');
      if (!L.isGroupId(id)) return send(res, 404, notFound);
      const g = await store.get(id);
      return g ? send(res, 200, L.toPublic(g)) : send(res, 404, notFound);
    }
    if (req.method === 'POST') {
      const body = readBody(req);
      const id = String(body.id || '');
      if (!L.isGroupId(id)) return send(res, 404, notFound);
      // Retry if two people save at the same moment.
      for (let attempt = 0; attempt < 5; attempt++) {
        const g = await store.get(id);
        if (!g) return send(res, 404, notFound);
        const prevV = g.v || 0;
        const next = L.applyOp(g, body.op);
        next.v = prevV + 1;
        next.updatedAt = Date.now();
        if (await store.replace(next, prevV)) return send(res, 200, L.toPublic(next));
      }
      return send(res, 409, { error: 'The group is busy. Try again.' });
    }
    return send(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return fail(res, e);
  }
};
