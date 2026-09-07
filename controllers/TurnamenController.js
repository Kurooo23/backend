import { v4 as uuidv4 } from 'uuid';
import { db, supabase } from '../config/db.js';
import { successResponse, errorResponse } from '../models/apiResponse.js';

// === Helper: Round name for elimination brackets ===
function getEliminationRoundName(matchesInRound, prefix = '') {
  if (matchesInRound === 1) return `${prefix}Final`.trim();
  if (matchesInRound === 2) return `${prefix}Semifinal`.trim();
  if (matchesInRound === 4) return `${prefix}Perempat Final`.trim();
  if (matchesInRound === 8) return `${prefix}Babak 16 Besar`.trim();
  if (matchesInRound === 16) return `${prefix}Babak 32 Besar`.trim();
  return `${prefix}Babak ${matchesInRound * 2} Besar`.trim();
}

// === Generator: Single Elimination ===
function generateSingleElimination(stmtPertandingan, id_turnamen, pesertaList, jumlahLeg = 1) {
  const count = pesertaList.length;
  let matchCountInRound = Math.floor(count / 2);
  let order = 1;
  const rounds = [];

  while (matchCountInRound >= 1) {
    const roundName = getEliminationRoundName(matchCountInRound);
    const currentRound = [];
    for (let i = 0; i < matchCountInRound; i++) {
      currentRound.push({
        id_pertandingan: uuidv4(),
        id_turnamen,
        id_peserta_1: null,
        id_peserta_2: null,
        babak: jumlahLeg === 2 ? `Leg 1 - ${roundName}` : roundName,
        skor_peserta_1: 0,
        skor_peserta_2: 0,
        status: 'Belum Mulai',
        urutan: order++,
        next_pertandingan_id: null
      });

      if (jumlahLeg === 2) {
        currentRound.push({
          id_pertandingan: uuidv4(),
          id_turnamen,
          id_peserta_1: null,
          id_peserta_2: null,
          babak: `Leg 2 - ${roundName}`,
          skor_peserta_1: 0,
          skor_peserta_2: 0,
          status: 'Belum Mulai',
          urutan: order++,
          next_pertandingan_id: null
        });
      }
    }
    rounds.push(currentRound);
    matchCountInRound = Math.floor(matchCountInRound / 2);
  }

  // Isi peserta babak pertama
  const step = jumlahLeg === 2 ? 2 : 1;
  for (let i = 0; i < Math.floor(rounds[0].length / step); i++) {
    const p1 = pesertaList[i * 2]?.id_peserta || null;
    const p2 = pesertaList[i * 2 + 1]?.id_peserta || null;
    rounds[0][i * step].id_peserta_1 = p1;
    rounds[0][i * step].id_peserta_2 = p2;
    if (jumlahLeg === 2) {
      rounds[0][i * step + 1].id_peserta_1 = p2;
      rounds[0][i * step + 1].id_peserta_2 = p1;
    }
  }

  // Hubungkan next_pertandingan_id antar babak
  for (let r = 0; r < rounds.length - 1; r++) {
    for (let i = 0; i < rounds[r].length; i++) {
      const matchPairIdx = Math.floor(i / (step * 2));
      const targetMatchIdx = Math.min(matchPairIdx * step, rounds[r + 1].length - 1);
      rounds[r][i].next_pertandingan_id = rounds[r + 1][targetMatchIdx].id_pertandingan;
    }
  }

  // Insert semua match
  for (const round of rounds) {
    for (const m of round) {
      stmtPertandingan.run(
        m.id_pertandingan, m.id_turnamen, m.id_peserta_1, m.id_peserta_2,
        m.babak, m.skor_peserta_1, m.skor_peserta_2, m.status, m.urutan, m.next_pertandingan_id
      );
    }
  }
}

// === Generator: Double Elimination ===
function generateDoubleElimination(stmtPertandingan, id_turnamen, pesertaList, jumlahLeg = 1) {
  const count = pesertaList.length;
  let order = 1;

  // --- Winners Bracket ---
  let wbMatchCount = Math.floor(count / 2);
  const wbRounds = [];
  while (wbMatchCount >= 1) {
    const roundName = getEliminationRoundName(wbMatchCount, 'WB ');
    const currentRound = [];
    for (let i = 0; i < wbMatchCount; i++) {
      currentRound.push({
        id_pertandingan: uuidv4(),
        id_turnamen,
        id_peserta_1: null,
        id_peserta_2: null,
        babak: jumlahLeg === 2 ? `Leg 1 - ${roundName}` : roundName,
        skor_peserta_1: 0,
        skor_peserta_2: 0,
        status: 'Belum Mulai',
        urutan: order++,
        next_pertandingan_id: null
      });
      if (jumlahLeg === 2) {
        currentRound.push({
          id_pertandingan: uuidv4(),
          id_turnamen,
          id_peserta_1: null,
          id_peserta_2: null,
          babak: `Leg 2 - ${roundName}`,
          skor_peserta_1: 0,
          skor_peserta_2: 0,
          status: 'Belum Mulai',
          urutan: order++,
          next_pertandingan_id: null
        });
      }
    }
    wbRounds.push(currentRound);
    wbMatchCount = Math.floor(wbMatchCount / 2);
  }

  const step = jumlahLeg === 2 ? 2 : 1;
  for (let i = 0; i < Math.floor(wbRounds[0].length / step); i++) {
    wbRounds[0][i * step].id_peserta_1 = pesertaList[i * 2]?.id_peserta || null;
    wbRounds[0][i * step].id_peserta_2 = pesertaList[i * 2 + 1]?.id_peserta || null;
    if (jumlahLeg === 2) {
      wbRounds[0][i * step + 1].id_peserta_1 = pesertaList[i * 2 + 1]?.id_peserta || null;
      wbRounds[0][i * step + 1].id_peserta_2 = pesertaList[i * 2]?.id_peserta || null;
    }
  }

  for (let r = 0; r < wbRounds.length - 1; r++) {
    for (let i = 0; i < wbRounds[r].length; i++) {
      const targetIdx = Math.min(Math.floor(i / 2), wbRounds[r + 1].length - 1);
      wbRounds[r][i].next_pertandingan_id = wbRounds[r + 1][targetIdx].id_pertandingan;
    }
  }

  // --- Losers Bracket ---
  const lbRounds = [];
  if (count > 2) {
    const lbRoundCount = Math.max(1, (wbRounds.length - 1) * 2);
    let lbMatchCount = Math.max(1, Math.floor(count / 4));
    for (let lr = 0; lr < lbRoundCount; lr++) {
      const roundName = `LB Babak ${lr + 1}`;
      const currentRound = [];
      const mc = Math.max(1, lbMatchCount);
      for (let i = 0; i < mc; i++) {
        currentRound.push({
          id_pertandingan: uuidv4(),
          id_turnamen,
          id_peserta_1: null,
          id_peserta_2: null,
          babak: jumlahLeg === 2 ? `Leg 1 - ${roundName}` : roundName,
          skor_peserta_1: 0,
          skor_peserta_2: 0,
          status: 'Belum Mulai',
          urutan: order++,
          next_pertandingan_id: null
        });
        if (jumlahLeg === 2) {
          currentRound.push({
            id_pertandingan: uuidv4(),
            id_turnamen,
            id_peserta_1: null,
            id_peserta_2: null,
            babak: `Leg 2 - ${roundName}`,
            skor_peserta_1: 0,
            skor_peserta_2: 0,
            status: 'Belum Mulai',
            urutan: order++,
            next_pertandingan_id: null
          });
        }
      }
      lbRounds.push(currentRound);
      if (lr % 2 === 1) lbMatchCount = Math.floor(lbMatchCount / 2);
    }

    for (let r = 0; r < lbRounds.length - 1; r++) {
      for (let i = 0; i < lbRounds[r].length; i++) {
        const nextIdx = Math.min(i, lbRounds[r + 1].length - 1);
        lbRounds[r][i].next_pertandingan_id = lbRounds[r + 1][nextIdx].id_pertandingan;
      }
    }
  }

  // --- Grand Final ---
  const gf1 = {
    id_pertandingan: uuidv4(),
    id_turnamen,
    id_peserta_1: null,
    id_peserta_2: null,
    babak: jumlahLeg === 2 ? 'Leg 1 - Grand Final' : 'Grand Final',
    skor_peserta_1: 0,
    skor_peserta_2: 0,
    status: 'Belum Mulai',
    urutan: order++,
    next_pertandingan_id: null
  };
  const gfMatches = [gf1];
  if (jumlahLeg === 2) {
    gfMatches.push({
      id_pertandingan: uuidv4(),
      id_turnamen,
      id_peserta_1: null,
      id_peserta_2: null,
      babak: 'Leg 2 - Grand Final',
      skor_peserta_1: 0,
      skor_peserta_2: 0,
      status: 'Belum Mulai',
      urutan: order++,
      next_pertandingan_id: null
    });
  }

  if (wbRounds.length > 0) {
    wbRounds[wbRounds.length - 1][0].next_pertandingan_id = gf1.id_pertandingan;
  }
  if (lbRounds.length > 0 && lbRounds[lbRounds.length - 1].length > 0) {
    lbRounds[lbRounds.length - 1][0].next_pertandingan_id = gf1.id_pertandingan;
  }

  const allRounds = [...wbRounds, ...lbRounds, gfMatches];
  for (const round of allRounds) {
    for (const m of round) {
      stmtPertandingan.run(
        m.id_pertandingan, m.id_turnamen, m.id_peserta_1, m.id_peserta_2,
        m.babak, m.skor_peserta_1, m.skor_peserta_2, m.status, m.urutan, m.next_pertandingan_id
      );
    }
  }
}

// === Generator: Round Robin ===
function generateRoundRobin(stmtPertandingan, id_turnamen, pesertaList, jumlahLeg = 1) {
  let order = 1;
  let matchNum = 1;
  // Leg 1 (Home)
  for (let i = 0; i < pesertaList.length; i++) {
    for (let j = i + 1; j < pesertaList.length; j++) {
      const babak = jumlahLeg === 2 ? `Leg 1 - Match ${matchNum}` : `Match ${matchNum}`;
      stmtPertandingan.run(
        uuidv4(), id_turnamen, pesertaList[i].id_peserta, pesertaList[j].id_peserta,
        babak, 0, 0, 'Belum Mulai', order++, null
      );
      matchNum++;
    }
  }

  // Leg 2 (Away) jika 2 leg
  if (jumlahLeg === 2) {
    matchNum = 1;
    for (let i = 0; i < pesertaList.length; i++) {
      for (let j = i + 1; j < pesertaList.length; j++) {
        stmtPertandingan.run(
          uuidv4(), id_turnamen, pesertaList[j].id_peserta, pesertaList[i].id_peserta,
          `Leg 2 - Match ${matchNum}`, 0, 0, 'Belum Mulai', order++, null
        );
        matchNum++;
      }
    }
  }
}

// === Generator: Liga ===
function generateLiga(stmtPertandingan, id_turnamen, pesertaList, jumlahLeg = 1) {
  generateRoundRobin(stmtPertandingan, id_turnamen, pesertaList, jumlahLeg);
}

// === Generator: Swiss System ===
function generateSwissSystem(stmtPertandingan, id_turnamen, pesertaList, jumlahLeg = 1) {
  let order = 1;
  const count = pesertaList.length;
  const matchCount = Math.floor(count / 2);
  for (let i = 0; i < matchCount; i++) {
    const p1 = pesertaList[i * 2]?.id_peserta || null;
    const p2 = pesertaList[i * 2 + 1]?.id_peserta || null;
    const babak1 = jumlahLeg === 2 ? 'Swiss Ronde 1 - Leg 1' : 'Swiss Ronde 1';
    stmtPertandingan.run(
      uuidv4(), id_turnamen, p1, p2,
      babak1, 0, 0, 'Belum Mulai', order++, null
    );
    if (jumlahLeg === 2) {
      stmtPertandingan.run(
        uuidv4(), id_turnamen, p2, p1,
        'Swiss Ronde 1 - Leg 2', 0, 0, 'Belum Mulai', order++, null
      );
    }
  }
}

// === Main Controller ===
export const createTurnamen = (req, res) => {
  try {
    const {
      nama_turnamen,
      deskripsi,
      tipe_game = 'E-Sports',
      format_bracket = 'Single Elimination',
      jumlah_leg = 1,
      tanggal_mulai,
      kuota,
      peserta = []
    } = req.body;

    if (!nama_turnamen || !kuota) {
      return res.status(400).json(errorResponse({ message: 'Nama turnamen dan kuota wajib diisi' }));
    }

    if (format_bracket === 'Double Elimination' && Number(kuota) < 4) {
      return res.status(400).json(errorResponse({ message: 'Format Double Elimination membutuhkan minimal 4 peserta' }));
    }

    const id_turnamen = uuidv4();
    const status = 'Akan Datang';
    const legCount = Number(jumlah_leg) === 2 ? 2 : 1;
    const effectiveTanggal = tanggal_mulai || new Date().toISOString();

    const insertTransaction = db.transaction(() => {
      const stmtTurnamen = db.prepare(`
        INSERT INTO turnamen (id_turnamen, nama_turnamen, deskripsi, tipe_game, format_bracket, jumlah_leg, tanggal_mulai, kuota, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmtTurnamen.run(id_turnamen, nama_turnamen, deskripsi || null, tipe_game, format_bracket, legCount, effectiveTanggal, Number(kuota), status);

      const stmtPeserta = db.prepare(`
        INSERT INTO peserta (id_peserta, id_turnamen, nama_peserta)
        VALUES (?, ?, ?)
      `);

      const pesertaList = [];
      const totalPeserta = Number(kuota);
      for (let i = 0; i < totalPeserta; i++) {
        const nama = peserta[i] && peserta[i].trim() ? peserta[i].trim() : `Peserta ${i + 1}`;
        const id_peserta = uuidv4();
        stmtPeserta.run(id_peserta, id_turnamen, nama);
        pesertaList.push({ id_peserta, id_turnamen, nama_peserta: nama });
      }

      const stmtPertandingan = db.prepare(`
        INSERT INTO pertandingan (
          id_pertandingan, id_turnamen, id_peserta_1, id_peserta_2,
          babak, skor_peserta_1, skor_peserta_2, status, urutan, next_pertandingan_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      if (format_bracket === 'Single Elimination') {
        generateSingleElimination(stmtPertandingan, id_turnamen, pesertaList, legCount);
      } else if (format_bracket === 'Double Elimination') {
        generateDoubleElimination(stmtPertandingan, id_turnamen, pesertaList, legCount);
      } else if (format_bracket === 'Liga') {
        generateLiga(stmtPertandingan, id_turnamen, pesertaList, legCount);
      } else if (format_bracket === 'Swiss System') {
        generateSwissSystem(stmtPertandingan, id_turnamen, pesertaList, legCount);
      } else {
        generateRoundRobin(stmtPertandingan, id_turnamen, pesertaList, legCount);
      }
    });

    insertTransaction();

    const createdTurnamen = db.prepare('SELECT * FROM turnamen WHERE id_turnamen = ?').get(id_turnamen);
    return res.status(201).json(successResponse({
      message: 'Turnamen berhasil dibuat beserta peserta dan jadwal pertandingan',
      data: createdTurnamen
    }));
  } catch (error) {
    console.error('Error createTurnamen:', error);
    return res.status(500).json(errorResponse({ message: error.message }));
  }
};

export const getAllTurnamen = (req, res) => {
  try {
    const { search, status } = req.query;
    let query = 'SELECT * FROM turnamen WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND nama_turnamen LIKE ?';
      params.push(`%${search}%`);
    }

    if (status && status !== 'Semua') {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY tanggal_mulai DESC';
    const data = db.prepare(query).all(...params);

    return res.json(successResponse({ data }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message }));
  }
};

export const getTurnamenAktif = (req, res) => {
  try {
    const data = db.prepare("SELECT * FROM turnamen WHERE status != 'Selesai' ORDER BY tanggal_mulai ASC").all();
    return res.json(successResponse({ data }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message }));
  }
};

export const getRiwayatTurnamen = (req, res) => {
  try {
    const data = db.prepare("SELECT * FROM turnamen WHERE status = 'Selesai' ORDER BY tanggal_mulai DESC").all();
    return res.json(successResponse({ data }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message }));
  }
};

export const getTurnamenById = (req, res) => {
  try {
    const { id } = req.params;
    const turnamen = db.prepare('SELECT * FROM turnamen WHERE id_turnamen = ?').get(id);

    if (!turnamen) {
      return res.status(404).json(errorResponse({ message: 'Turnamen tidak ditemukan' }));
    }

    const peserta = db.prepare('SELECT * FROM peserta WHERE id_turnamen = ?').all(id);
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
    `).all(id);

    return res.json(successResponse({
      data: {
        ...turnamen,
        peserta,
        pertandingan
      }
    }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message }));
  }
};

export const updateTurnamen = (req, res) => {
  try {
    const { id } = req.params;
    const { nama_turnamen, deskripsi, tipe_game, format_bracket, jumlah_leg, tanggal_mulai, status } = req.body;

    const existing = db.prepare('SELECT * FROM turnamen WHERE id_turnamen = ?').get(id);
    if (!existing) {
      return res.status(404).json(errorResponse({ message: 'Turnamen tidak ditemukan' }));
    }

    const updatedNama = nama_turnamen ?? existing.nama_turnamen;
    const updatedDeskripsi = deskripsi !== undefined ? deskripsi : existing.deskripsi;
    const updatedTipeGame = tipe_game ?? existing.tipe_game ?? 'E-Sports';
    const updatedJumlahLeg = jumlah_leg !== undefined ? Number(jumlah_leg) : (existing.jumlah_leg ?? 1);
    const updatedTanggal = tanggal_mulai ?? existing.tanggal_mulai;
    const updatedStatus = status ?? existing.status;

    db.prepare(`
      UPDATE turnamen
      SET nama_turnamen = ?, deskripsi = ?, tipe_game = ?, jumlah_leg = ?, tanggal_mulai = ?, status = ?
      WHERE id_turnamen = ?
    `).run(updatedNama, updatedDeskripsi, updatedTipeGame, updatedJumlahLeg, updatedTanggal, updatedStatus, id);

    const updated = db.prepare('SELECT * FROM turnamen WHERE id_turnamen = ?').get(id);
    return res.json(successResponse({ message: 'Data turnamen berhasil diperbarui', data: updated }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message }));
  }
};

export const deleteTurnamen = (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM turnamen WHERE id_turnamen = ?').get(id);
    if (!existing) {
      return res.status(404).json(errorResponse({ message: 'Turnamen tidak ditemukan' }));
    }

    db.prepare('DELETE FROM turnamen WHERE id_turnamen = ?').run(id);
    return res.json(successResponse({ message: 'Turnamen dan data terkait berhasil dihapus' }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message }));
  }
};
