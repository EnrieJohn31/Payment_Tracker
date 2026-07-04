import { type SQLiteDatabase } from 'expo-sqlite';

export type PaymentItem = {
  id: number;
  paymentId: number;
  name: string;
  price: number;
  quantity: number;
};

export type Payment = {
  id: number;
  place: string;
  total: number;
  receiptUri: string | null;
  latitude: number | null;
  longitude: number | null;
  /** e.g. "GCash", "Metrobank Credit Card"; null when not recorded */
  paymentMethod: string | null;
  /** ms epoch */
  createdAt: number;
};

export type NewPaymentInput = {
  place: string;
  receiptUri: string | null;
  latitude: number | null;
  longitude: number | null;
  paymentMethod: string | null;
  createdAt: number;
  items: { name: string; price: number; quantity: number }[];
};

const SCHEMA_VERSION = 2;

export async function migrateDb(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= SCHEMA_VERSION) return;

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  if (current < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        place TEXT NOT NULL,
        total REAL NOT NULL,
        receipt_uri TEXT,
        latitude REAL,
        longitude REAL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payment_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1
      );

      CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
      CREATE INDEX IF NOT EXISTS idx_items_payment_id ON payment_items(payment_id);

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  if (current < 2) {
    await db.execAsync('ALTER TABLE payments ADD COLUMN payment_method TEXT;');
  }

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
}

type ItemRow = {
  id: number;
  payment_id: number;
  name: string;
  price: number;
  quantity: number;
};

type PaymentRow = {
  id: number;
  place: string;
  total: number;
  receipt_uri: string | null;
  latitude: number | null;
  longitude: number | null;
  payment_method: string | null;
  created_at: number;
};

function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    place: row.place,
    total: row.total,
    receiptUri: row.receipt_uri,
    latitude: row.latitude,
    longitude: row.longitude,
    paymentMethod: row.payment_method,
    createdAt: row.created_at,
  };
}

export async function getAllPayments(db: SQLiteDatabase): Promise<Payment[]> {
  const rows = await db.getAllAsync<PaymentRow>(
    'SELECT * FROM payments ORDER BY created_at DESC',
  );
  return rows.map(toPayment);
}

export async function getPaymentItems(
  db: SQLiteDatabase,
  paymentId: number,
): Promise<PaymentItem[]> {
  const rows = await db.getAllAsync<ItemRow>(
    'SELECT * FROM payment_items WHERE payment_id = ? ORDER BY id',
    paymentId,
  );
  return rows.map((r: ItemRow) => ({
    id: r.id,
    paymentId: r.payment_id,
    name: r.name,
    price: r.price,
    quantity: r.quantity,
  }));
}

export async function insertPayment(
  db: SQLiteDatabase,
  input: NewPaymentInput,
): Promise<number> {
  const total = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let paymentId = 0;

  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO payments (place, total, receipt_uri, latitude, longitude, payment_method, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      input.place,
      total,
      input.receiptUri,
      input.latitude,
      input.longitude,
      input.paymentMethod,
      input.createdAt,
    );
    paymentId = result.lastInsertRowId;

    for (const item of input.items) {
      await db.runAsync(
        'INSERT INTO payment_items (payment_id, name, price, quantity) VALUES (?, ?, ?, ?)',
        paymentId,
        item.name,
        item.price,
        item.quantity,
      );
    }
  });

  return paymentId;
}

export async function deletePayment(db: SQLiteDatabase, paymentId: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM payment_items WHERE payment_id = ?', paymentId);
    await db.runAsync('DELETE FROM payments WHERE id = ?', paymentId);
  });
}

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export async function setSetting(
  db: SQLiteDatabase,
  key: string,
  value: string | null,
): Promise<void> {
  if (value === null) {
    await db.runAsync('DELETE FROM settings WHERE key = ?', key);
  } else {
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key,
      value,
    );
  }
}
