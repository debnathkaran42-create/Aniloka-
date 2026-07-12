/* =========================================================
   ANILOKA CUSTOM DATABASE ENGINE
   -----------------------------------------------------------
   A small document database written from scratch for AniLoka —
   no MongoDB, no Firebase, no external DB engine. Each
   "collection" (users, manga, chapters, ...) is a JSON file on
   disk. Writes are atomic (write to a temp file, then rename)
   so a crash mid-write can never corrupt data. An in-memory
   index is rebuilt from disk on boot for fast lookups by id
   and by arbitrary indexed fields (e.g. email).

   This is intentionally simple and dependency-free so it runs
   on literally any Node host with zero native build steps.
   For heavier traffic later, swap Collection's internals for
   real SQLite/Postgres without changing the call sites below —
   every route/controller only ever talks to db.collection(name).
   ========================================================= */

"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${crypto.randomBytes(4).toString("hex")}`;
}

class Collection {
  constructor(dataDir, name, indexedFields = []) {
    this.name = name;
    this.file = path.join(dataDir, `${name}.json`);
    this.indexedFields = indexedFields;
    this._rows = new Map();     // id -> row
    this._indexes = {};         // field -> Map(value -> Set(ids))
    indexedFields.forEach(f => (this._indexes[f] = new Map()));
    this._load();
  }

  _load() {
    if (!fs.existsSync(this.file)) {
      fs.writeFileSync(this.file, "[]", "utf8");
      return;
    }
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(this.file, "utf8") || "[]");
    } catch (e) {
      // Corrupt file protection: back it up instead of crashing the whole app
      const backup = this.file + ".corrupt." + Date.now();
      fs.copyFileSync(this.file, backup);
      raw = [];
    }
    raw.forEach(row => this._indexRow(row));
  }

  _indexRow(row) {
    this._rows.set(row.id, row);
    this.indexedFields.forEach(f => {
      const val = row[f];
      if (val === undefined) return;
      if (!this._indexes[f].has(val)) this._indexes[f].set(val, new Set());
      this._indexes[f].get(val).add(row.id);
    });
  }

  _unindexRow(row) {
    this.indexedFields.forEach(f => {
      const val = row[f];
      const set = this._indexes[f]?.get(val);
      if (set) { set.delete(row.id); if (!set.size) this._indexes[f].delete(val); }
    });
  }

  _persist() {
    const all = [...this._rows.values()];
    const tmp = this.file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(all, null, 2), "utf8");
    fs.renameSync(tmp, this.file); // atomic on POSIX filesystems
  }

  insert(data) {
    const row = { id: data.id || newId(this.name.slice(0, 3)), createdAt: new Date().toISOString(), ...data };
    if (this._rows.has(row.id)) throw new Error(`Duplicate id in ${this.name}: ${row.id}`);
    this._indexRow(row);
    this._persist();
    return row;
  }

  findById(id) { return this._rows.get(id) || null; }

  findOneBy(field, value) {
    const ids = this._indexes[field]?.get(value);
    if (!ids || !ids.size) return null;
    return this._rows.get([...ids][0]) || null;
  }

  findManyBy(field, value) {
    const ids = this._indexes[field]?.get(value);
    if (!ids) return [];
    return [...ids].map(id => this._rows.get(id)).filter(Boolean);
  }

  find(predicate) {
    const all = [...this._rows.values()];
    return predicate ? all.filter(predicate) : all;
  }

  update(id, patch) {
    const row = this._rows.get(id);
    if (!row) return null;
    this._unindexRow(row);
    const updated = { ...row, ...patch, id, updatedAt: new Date().toISOString() };
    this._indexRow(updated);
    this._persist();
    return updated;
  }

  delete(id) {
    const row = this._rows.get(id);
    if (!row) return false;
    this._unindexRow(row);
    this._rows.delete(id);
    this._persist();
    return true;
  }

  count() { return this._rows.size; }
  all() { return [...this._rows.values()]; }
}

class AnilokaDB {
  constructor(dataDir) {
    this.dataDir = dataDir;
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    this._collections = {};
  }

  collection(name, indexedFields = []) {
    if (!this._collections[name]) {
      this._collections[name] = new Collection(this.dataDir, name, indexedFields);
    }
    return this._collections[name];
  }
}

module.exports = { AnilokaDB, newId };
