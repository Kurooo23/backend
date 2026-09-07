import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =======================================================
// 1. KONEKSI & INISIALISASI SQLITE (OFFLINE / LOKAL)
// =======================================================
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'rivnet.db');
export const db = new Database(dbPath);

// Aktifkan Foreign Keys
db.pragma('foreign_keys = ON');

// Inisialisasi Tabel Sesuai ERD SQLite
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS turnamen (
      id_turnamen    TEXT PRIMARY KEY,
      nama_turnamen  TEXT NOT NULL,
      deskripsi      TEXT,
      tipe_game      TEXT NOT NULL DEFAULT 'E-Sports',
      format_bracket TEXT NOT NULL,
      tanggal_mulai  TEXT NOT NULL,
      kuota          INTEGER NOT NULL,
      jumlah_leg     INTEGER NOT NULL DEFAULT 1,
      status         TEXT NOT NULL DEFAULT 'Akan Datang'
    );

    CREATE TABLE IF NOT EXISTS peserta (
      id_peserta   TEXT PRIMARY KEY,
      id_turnamen  TEXT NOT NULL,
      nama_peserta TEXT NOT NULL,
      FOREIGN KEY (id_turnamen) REFERENCES turnamen(id_turnamen) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pertandingan (
      id_pertandingan      TEXT PRIMARY KEY,
      id_turnamen          TEXT NOT NULL,
      id_peserta_1         TEXT,
      id_peserta_2         TEXT,
      babak                TEXT NOT NULL,
      skor_peserta_1       INTEGER DEFAULT 0,
      skor_peserta_2       INTEGER DEFAULT 0,
      status               TEXT NOT NULL DEFAULT 'Belum Mulai',
      urutan               INTEGER DEFAULT 0,
      next_pertandingan_id TEXT,
      FOREIGN KEY (id_turnamen)  REFERENCES turnamen(id_turnamen) ON DELETE CASCADE,
      FOREIGN KEY (id_peserta_1) REFERENCES peserta(id_peserta) ON DELETE SET NULL,
      FOREIGN KEY (id_peserta_2) REFERENCES peserta(id_peserta) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id_user      TEXT PRIMARY KEY,
      email        TEXT UNIQUE NOT NULL,
      password     TEXT NOT NULL,
      nickname     TEXT NOT NULL,
      avatar_index INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL
    );
  `);

  try {
    db.exec("ALTER TABLE turnamen ADD COLUMN tipe_game TEXT DEFAULT 'E-Sports'");
  } catch (_) {}
  try {
    db.exec("ALTER TABLE turnamen ADD COLUMN jumlah_leg INTEGER DEFAULT 1");
  } catch (_) {}

  console.log('Database SQLite (rivnet.db) berhasil diinisialisasi dengan kolom tipe_game.');
}

// =======================================================
// 2. KONEKSI SUPABASE (ONLINE / CLOUD)
// =======================================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase Warning] SUPABASE_URL atau SUPABASE_ANON_KEY belum disetel di file .env'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://xyzcompany.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy'
);

export default { db, supabase, initDatabase };
