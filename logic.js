// Pure group logic: validation and changes. No database code here.
const crypto = require('crypto');

const CURRENCIES = ['CAD', 'USD', 'INR', 'EUR', 'GBP', 'AUD', 'SGD', 'AED'];
const ALPHA = 'abcdefghijklmnopqrstuvwxyz0123456789';

class BadRequest extends Error {
  constructor(msg) { super(msg); this.status = 400; }
}

function newId(len) {
  const bytes = crypto.randomBytes(len);
  let s = '';
  for (const b of bytes) s += ALPHA[b % 36];
  return s;
}
const isGroupId = (id) => typeof id === 'string' && /^[a-z0-9]{12,24}$/.test(id);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

function text(v, max, label) {
  if (typeof v !== 'string' || !v.trim()) throw new BadRequest(label + ' is required.');
  return v.trim().slice(0, max);
}
function cents(v) {
  if (!Number.isInteger(v) || v <= 0 || v > 1e11) throw new BadRequest('Enter a valid amount.');
  return v;
}
function day(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : new Date().toISOString().slice(0, 10);
}

function makeGroup(input) {
  input = input || {};
  const name = text(input.name, 50, 'Group name');
  const currency = CURRENCIES.includes(input.currency) ? input.currency : 'CAD';
  const seen = new Set();
  const people = (Array.isArray(input.people) ? input.people : [])
    .filter((p) => typeof p === 'string')
    .map((p) => p.trim().slice(0, 40))
    .filter((p) => p && !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase()));
  if (people.length < 2) throw new BadRequest('Add at least two people.');
  if (people.length > 50) throw new BadRequest('A group can have up to 50 people.');
  const now = Date.now();
  return {
    _id: newId(16),
    name,
    currency,
    members: people.map((n) => ({ id: newId(8), name: n })),
    expenses: [],
    v: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function cleanExpense(g, e) {
  if (!e || typeof e !== 'object') throw new BadRequest('Missing expense.');
  const ids = new Set(g.members.map((m) => m.id));
  const type = e.type === 'payment' ? 'payment' : 'expense';
  const amount = cents(e.amount);
  if (!ids.has(e.paidBy)) throw new BadRequest('Pick who paid.');
  if (!e.splits || typeof e.splits !== 'object') throw new BadRequest('Missing split.');
  const splits = {};
  let sum = 0;
  for (const [k, v] of Object.entries(e.splits)) {
    if (!ids.has(k)) throw new BadRequest('Someone in the split is not in this group.');
    if (!Number.isInteger(v) || v < 0) throw new BadRequest('Invalid split amount.');
    if (v > 0) { splits[k] = v; sum += v; }
  }
  if (sum !== amount) throw new BadRequest('The split does not add up to the total.');
  if (type === 'payment') {
    const keys = Object.keys(splits);
    if (keys.length !== 1 || keys[0] === e.paidBy) throw new BadRequest('A payment needs two different people.');
  }
  const out = {
    id: typeof e.id === 'string' && /^[a-z0-9]{4,20}$/.test(e.id) ? e.id : newId(10),
    type,
    desc: type === 'payment' ? 'Payment' : text(e.desc, 80, 'Description'),
    amount,
    paidBy: e.paidBy,
    date: day(e.date),
    splits,
    created: Number.isFinite(e.created) ? e.created : Date.now(),
  };
  if (type === 'expense') {
    out.mode = ['equal', 'exact', 'percent'].includes(e.mode) ? e.mode : 'exact';
    if (out.mode === 'percent' && e.pct && typeof e.pct === 'object') {
      out.pct = {};
      for (const [k, v] of Object.entries(e.pct)) if (ids.has(k)) out.pct[k] = String(v).slice(0, 8);
    }
  }
  return out;
}

// Applies one change to a group document (mutates and returns it).
function applyOp(g, op) {
  switch (op && op.type) {
    case 'saveExpense': {
      const e = cleanExpense(g, op.expense);
      const i = g.expenses.findIndex((x) => x.id === e.id);
      if (i >= 0) { e.created = g.expenses[i].created; g.expenses[i] = e; }
      else {
        if (g.expenses.length >= 5000) throw new BadRequest('This group has too many entries.');
        g.expenses.push(e);
      }
      return g;
    }
    case 'deleteExpense':
      g.expenses = g.expenses.filter((x) => x.id !== op.id);
      return g;
    case 'addMember': {
      const n = text(op.name, 40, 'Name');
      if (g.members.some((m) => m.name.toLowerCase() === n.toLowerCase())) throw new BadRequest('That name is already in the group.');
      if (g.members.length >= 50) throw new BadRequest('A group can have up to 50 people.');
      g.members.push({ id: newId(8), name: n });
      return g;
    }
    case 'removeMember':
      if (g.expenses.some((e) => e.paidBy === op.id || has(e.splits, op.id))) throw new BadRequest('This person is part of an expense, so they cannot be removed.');
      g.members = g.members.filter((m) => m.id !== op.id);
      return g;
    case 'updateGroup':
      g.name = text(op.name, 50, 'Group name');
      if (CURRENCIES.includes(op.currency)) g.currency = op.currency;
      return g;
    default:
      throw new BadRequest('Unknown action.');
  }
}

// Shape sent to the browser.
function toPublic(g) {
  return { id: g._id, name: g.name, currency: g.currency, members: g.members, expenses: g.expenses, v: g.v || 0, updatedAt: g.updatedAt };
}

module.exports = { BadRequest, CURRENCIES, newId, isGroupId, makeGroup, cleanExpense, applyOp, toPublic };
