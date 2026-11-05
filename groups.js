// GET  /api/groups?ids=a,b,c  -> { groups: [...] }   (the groups saved on this phone)
// POST /api/groups {name, currency, people[]} -> new group
const store = require('../lib/db');
const L = require('../lib/logic');
const { send, readBody, fail } = require('../lib/http');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const ids = String((req.query && req.query.ids) || '')
        .split(',')
        .filter(L.isGroupId)
        .slice(0, 50);
      if (!ids.length) return send(res, 200, { groups: [] });
      const docs = await store.getMany(ids);
      return send(res, 200, { groups: docs.map(L.toPublic) });
    }
    if (req.method === 'POST') {
      const g = L.makeGroup(readBody(req));
      await store.insert(g);
      return send(res, 201, L.toPublic(g));
    }
    return send(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return fail(res, e);
  }
};
