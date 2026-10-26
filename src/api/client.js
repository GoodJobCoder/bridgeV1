// Data access. Every entity exposes the same interface as the Base44 SDK:
//   list(sort?), filter(query, sort?), get(id), create(data), update(id, data), delete(id)
//
// If VITE_BASE44_APP_ID is set, records are stored in Base44's database.
// Otherwise a localStorage adapter with the identical interface is used, so the
// app (and its demo) runs offline with no account.

import { createClient } from '@base44/sdk';

export const ENTITY_NAMES = ['Organization', 'Opportunity', 'VolunteerProfile', 'Assignment', 'Report'];

const appId = import.meta.env?.VITE_BASE44_APP_ID;

function sortRecords(records, sort) {
  if (!sort) return records;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  return [...records].sort((a, b) => {
    const x = a[field] ?? '';
    const y = b[field] ?? '';
    return (x < y ? -1 : x > y ? 1 : 0) * (desc ? -1 : 1);
  });
}

function localEntity(name) {
  const key = `bridge:db:${name}`;
  const read = () => JSON.parse(localStorage.getItem(key) || '[]');
  const write = (rows) => localStorage.setItem(key, JSON.stringify(rows));
  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  return {
    async list(sort) {
      return sortRecords(read(), sort);
    },
    async filter(query = {}, sort) {
      return sortRecords(read().filter((r) => Object.entries(query).every(([k, v]) => r[k] === v)), sort);
    },
    async get(id) {
      const row = read().find((r) => r.id === id);
      if (!row) throw new Error(`${name} ${id} not found`);
      return row;
    },
    async create(data) {
      const now = new Date().toISOString();
      const row = { ...data, id: newId(), created_date: now, updated_date: now };
      write([...read(), row]);
      return row;
    },
    async update(id, data) {
      const rows = read();
      const i = rows.findIndex((r) => r.id === id);
      if (i < 0) throw new Error(`${name} ${id} not found`);
      rows[i] = { ...rows[i], ...data, id, updated_date: new Date().toISOString() };
      write(rows);
      return rows[i];
    },
    async delete(id) {
      write(read().filter((r) => r.id !== id));
    },
  };
}

export const backend = appId ? 'base44' : 'local';

export const base44 = appId ? createClient({ appId }) : null;

export const db = Object.fromEntries(
  ENTITY_NAMES.map((name) => [name, base44 ? base44.entities[name] : localEntity(name)]),
);
