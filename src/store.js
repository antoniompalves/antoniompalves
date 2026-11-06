// Tiny JSON-file store. One file, atomic writes — fine for a few thousand cars.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export class Store {
  constructor(dir) {
    this.dir = dir;
    this.file = path.join(dir, 'db.json');
    fs.mkdirSync(dir, { recursive: true });
    this.data = { deals: [], settings: {} };
    if (fs.existsSync(this.file)) this.data = { ...this.data, ...JSON.parse(fs.readFileSync(this.file, 'utf8')) };
  }
  save() {
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 1));
    fs.renameSync(tmp, this.file);
  }
  backup() {
    const b = path.join(this.dir, 'backups');
    fs.mkdirSync(b, { recursive: true });
    fs.copyFileSync(this.file, path.join(b, `db-${new Date().toISOString().replace(/[:.]/g, '-')}.json`));
    const files = fs.readdirSync(b).sort();
    for (const f of files.slice(0, Math.max(0, files.length - 30))) fs.unlinkSync(path.join(b, f));
  }
  get deals() { return this.data.deals; }
  get ledger() { return (this.data.ledger ||= { general: [], settlements: [] }); }
  find(id) { return this.data.deals.find((d) => d.id === id); }

  /** Insert or update by (source, sourceId). Keeps user fields, tracks price drops. */
  upsert(incoming) {
    const now = new Date().toISOString();
    const existing = incoming.sourceId && this.data.deals.find((d) => d.source === incoming.source && d.sourceId === incoming.sourceId);
    if (existing) {
      const keep = ['status', 'market', 'overrides', 'quality', 'favorite', 'notes', 'expenses', 'checklist', 'dates', 'salePrice', 'co2Standard', 'dieselParticles'];
      if (incoming.price && existing.price && incoming.price !== existing.price) {
        existing.priceHistory = [...(existing.priceHistory || []), { date: now, price: existing.price }];
      }
      for (const [k, v] of Object.entries(incoming)) {
        if (keep.includes(k) && existing[k] != null) continue;
        if (v == null || v === '') continue;
        if ((k === 'cc' || k === 'co2') && existing[k] && existing[`${k}Manual`]) continue;
        existing[k] = v;
      }
      existing.lastSeenAt = now;
      existing.updatedAt = now;
      this.save();
      return { deal: existing, created: false };
    }
    const deal = {
      id: crypto.randomUUID(), status: 'new', market: { comps: [] }, overrides: {}, expenses: [], checklist: {}, dates: {},
      quality: 3, favorite: false, notes: '', createdAt: now, updatedAt: now, lastSeenAt: now, ...incoming,
    };
    this.data.deals.unshift(deal);
    this.save();
    return { deal, created: true };
  }
  update(id, patch) {
    const d = this.find(id);
    if (!d) return null;
    delete patch.id;
    Object.assign(d, patch, { updatedAt: new Date().toISOString() });
    this.save();
    return d;
  }
  remove(id) {
    const n = this.data.deals.length;
    this.data.deals = this.data.deals.filter((d) => d.id !== id);
    this.save();
    return this.data.deals.length !== n;
  }
}
