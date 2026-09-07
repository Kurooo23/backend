import { db, supabase } from '../config/db.js';
import { successResponse, errorResponse } from '../models/apiResponse.js';

export const getPertandinganByTurnamen = (req, res) => {
  try {
    const { idTurnamen } = req.params;
    const pertandingan = db.prepare(`
      SELECT 
        m.*,
        p1.nama_peserta AS nama_peserta_1,
        p2.nama_peserta AS nama_peserta_2
      FROM pertandingan m
      LEFT JOIN peserta p1 ON m.id_peserta_1 = p1.id_peserta
      LEFT JOIN peserta p2 ON m.id_peserta_2 = p2.id_peserta
      WHERE m.id_turnamen = ?
      ORDER BY m.urutan ASC
    `).all(idTurnamen);

    return res.json(successResponse({ data: pertandingan }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message }));
  }
};

export const getPertandinganById = (req, res) => {
  try {
    const { id } = req.params;
    const match = db.prepare(`
      SELECT 
        m.*,
        p1.nama_peserta AS nama_peserta_1,
        p2.nama_peserta AS nama_peserta_2
      FROM pertandingan m
      LEFT JOIN peserta p1 ON m.id_peserta_1 = p1.id_peserta
      LEFT JOIN peserta p2 ON m.id_peserta_2 = p2.id_peserta
      WHERE m.id_pertandingan = ?
    `).get(id);

    if (!match) {
      return res.status(404).json(errorResponse({ message: 'Pertandingan tidak ditemukan' }));
    }

    return res.json(successResponse({ data: match }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message }));
  }
};

export const updateSkorPertandingan = (req, res) => {
  try {
    const { id } = req.params;
    const { skor_peserta_1, skor_peserta_2, status = 'Selesai' } = req.body;

    const currentMatch = db.prepare('SELECT * FROM pertandingan WHERE id_pertandingan = ?').get(id);
    if (!currentMatch) {
      return res.status(404).json(errorResponse({ message: 'Pertandingan tidak ditemukan' }));
    }

    const s1 = Number(skor_peserta_1 ?? currentMatch.skor_peserta_1);
    const s2 = Number(skor_peserta_2 ?? currentMatch.skor_peserta_2);

    const updateTransaction = db.transaction(() => {
      // 1. Update skor & status pertandingan ini
      db.prepare(`
        UPDATE pertandingan
        SET skor_peserta_1 = ?, skor_peserta_2 = ?, status = ?
        WHERE id_pertandingan = ?
      `).run(s1, s2, status, id);

      // 2. Ubah status turnamen ke 'Berlangsung' jika masih 'Akan Datang'
      db.prepare(`
        UPDATE turnamen
        SET status = 'Berlangsung'
        WHERE id_turnamen = ? AND status = 'Akan Datang'
      `).run(currentMatch.id_turnamen);

      // 3. Jika pertandingan selesai dan ada laga lanjutan di bracket, majukan pemenang
      if (status === 'Selesai' && currentMatch.next_pertandingan_id) {
        let winnerId = null;
        if (s1 > s2) winnerId = currentMatch.id_peserta_1;
        else if (s2 > s1) winnerId = currentMatch.id_peserta_2;

        if (winnerId) {
          const siblings = db.prepare(`
            SELECT id_pertandingan FROM pertandingan
            WHERE next_pertandingan_id = ?
            ORDER BY urutan ASC
          `).all(currentMatch.next_pertandingan_id);

          if (siblings.length > 0) {
            const isSlot1 = siblings[0].id_pertandingan === id;
            const updateField = isSlot1 ? 'id_peserta_1' : 'id_peserta_2';

            db.prepare(`
              UPDATE pertandingan
              SET ${updateField} = ?
              WHERE id_pertandingan = ?
            `).run(winnerId, currentMatch.next_pertandingan_id);
          }
        }
      }

      // 4. Cek apakah seluruh pertandingan pada turnamen ini sudah selesai
      const allMatches = db.prepare('SELECT status FROM pertandingan WHERE id_turnamen = ?').all(currentMatch.id_turnamen);
      const isAllFinished = allMatches.length > 0 && allMatches.every(m => m.status === 'Selesai');
      if (isAllFinished) {
        db.prepare("UPDATE turnamen SET status = 'Selesai' WHERE id_turnamen = ?").run(currentMatch.id_turnamen);
      }
    });

    updateTransaction();

    const updatedMatch = db.prepare(`
      SELECT 
        m.*,
        p1.nama_peserta AS nama_peserta_1,
        p2.nama_peserta AS nama_peserta_2
      FROM pertandingan m
      LEFT JOIN peserta p1 ON m.id_peserta_1 = p1.id_peserta
      LEFT JOIN peserta p2 ON m.id_peserta_2 = p2.id_peserta
      WHERE m.id_pertandingan = ?
    `).get(id);

    return res.json(successResponse({
      message: 'Hasil skor pertandingan berhasil diperbarui',
      data: updatedMatch
    }));
  } catch (error) {
    console.error('Error updateSkorPertandingan:', error);
    return res.status(500).json(errorResponse({ message: error.message }));
  }
};
