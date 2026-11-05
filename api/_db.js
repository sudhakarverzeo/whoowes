// Database access. Uses MongoDB Atlas via the MONGODB_URI environment variable.
// Set WHOOWES_MEMORY=1 to use an in-memory store for local testing.

function memoryStore() {
  const data = new Map();
  const copy = (x) => (x ? JSON.parse(JSON.stringify(x)) : null);
  return {
    async get(id) { return copy(data.get(id)); },
    async getMany(ids) { return ids.map((id) => copy(data.get(id))).filter(Boolean); },
    async insert(doc) { data.set(doc._id, copy(doc)); },
    async replace(doc, prevV) {
      const cur = data.get(doc._id);
      if (!cur || (cur.v || 0) !== prevV) return false;
      data.set(doc._id, copy(doc));
      return true;
    },
  };
}

function mongoStore() {
  const { MongoClient } = require('mongodb');
  let pending = null;
  function collection() {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
    if (!pending) {
      pending = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 5 })
        .connect()
        .catch((e) => { pending = null; throw e; });
    }
    return pending.then((c) => c.db(process.env.MONGODB_DB || 'whoowes').collection('groups'));
  }
  return {
    async get(id) { return (await collection()).findOne({ _id: id }); },
    async getMany(ids) { return (await collection()).find({ _id: { $in: ids } }).toArray(); },
    async insert(doc) { await (await collection()).insertOne(doc); },
    // Only replaces if nobody else saved in between (version check).
    async replace(doc, prevV) {
      const r = await (await collection()).replaceOne({ _id: doc._id, v: prevV }, doc);
      return r.matchedCount === 1;
    },
  };
}

module.exports = process.env.WHOOWES_MEMORY ? memoryStore() : mongoStore();
