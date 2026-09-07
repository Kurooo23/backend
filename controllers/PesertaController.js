import { v4 as uuidv4 } from 'uuid';
import { db, supabase } from '../config/db.js';
import { successResponse, errorResponse } from '../models/apiResponse.js';

export const getPesertaByTurnamen = (req, res) => {
  try {
    const { idTurnamen } = req.params;
    const peserta = db.prepare('SELECT * FROM peserta WHERE id_turnamen = ?').all(idTurnamen);
    return res.json(successResponse({ data: peserta }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message }));
  }
};

export const createPeserta = (req, res) => {
  try {
    const { id_turnamen, nama_peserta } = req.body;
    if (!id_turnamen || !nama_peserta) {
      return res.status(400).json(errorResponse({ message: 'id_turnamen dan nama_peserta wajib diisi' }));
    }

    const id_peserta = uuidv4();
    db.prepare('INSERT INTO peserta (id_peserta, id_turnamen, nama_peserta) VALUES (?, ?, ?)')
      .run(id_peserta, id_turnamen, nama_peserta);

    const created = db.prepare('SELECT * FROM peserta WHERE id_peserta = ?').get(id_peserta);
    return res.status(201).json(successResponse({ message: 'Peserta berhasil ditambahkan', data: created }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message }));
  }
};

export const deletePeserta = (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM peserta WHERE id_peserta = ?').get(id);
    if (!existing) {
      return res.status(404).json(errorResponse({ message: 'Peserta tidak ditemukan' }));
    }

    db.prepare('DELETE FROM peserta WHERE id_peserta = ?').run(id);
    return res.json(successResponse({ message: 'Peserta berhasil dihapus' }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message }));
  }
};
