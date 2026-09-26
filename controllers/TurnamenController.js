// backend/controllers/TurnamenController.js

import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/db.js';
import { successResponse, errorResponse } from '../models/apiResponse.js';

const fail = (error) => {
  if (error) throw error;
};

const attachUsernamePemilik = async (turnamenList) => {
  if (!turnamenList || turnamenList.length === 0) {
    return [];
  }

  const pemilikIds = [
    ...new Set(
      turnamenList
        .map((turnamen) => turnamen.id_pemilik)
        .filter(Boolean),
    ),
  ];

  if (pemilikIds.length === 0) {
    return turnamenList.map((turnamen) => ({
      ...turnamen,
      username_pemilik: 'Tidak diketahui',
      avatar_pemilik: 0,
    }));
  }

  const { data: users, error } = await supabaseAdmin
    .from('user')
    .select('id, username, avatar_index')
    .in('id', pemilikIds);

  fail(error);

  const userMap = Object.fromEntries(
    (users ?? []).map((user) => [user.id, user]),
  );

  return turnamenList.map((turnamen) => ({
    ...turnamen,
    username_pemilik:
      userMap[turnamen.id_pemilik]?.username ?? 'Tidak diketahui',
    avatar_pemilik:
      userMap[turnamen.id_pemilik]?.avatar_index ?? 0,
  }));
};

const makeMatches = (idTurnamen, userIds, formatBracket) => {
  const matches = [];

  if (formatBracket === 'Liga') {
    let nomor = 1;

    for (let i = 0; i < userIds.length; i++) {
      for (let j = i + 1; j < userIds.length; j++) {
        matches.push({
          id_pertandingan: uuidv4(),
          id_turnamen: idTurnamen,
          id_user_1: userIds[i],
          id_user_2: userIds[j],
          babak: `Match ${nomor++}`,
          skor_user_1: 0,
          skor_user_2: 0,
          status: 'Belum Mulai',
        });
      }
    }

    return matches;
  }

  for (let i = 0; i < userIds.length - 1; i += 2) {
    matches.push({
      id_pertandingan: uuidv4(),
      id_turnamen: idTurnamen,
      id_user_1: userIds[i],
      id_user_2: userIds[i + 1],
      babak:
        formatBracket === 'Double Elimination'
          ? 'Winners Bracket - Babak 1'
          : formatBracket === 'Swiss System'
            ? 'Swiss Ronde 1'
            : 'Babak 1',
      skor_user_1: 0,
      skor_user_2: 0,
      status: 'Belum Mulai',
    });
  }

  return matches;
};

const ownerOnly = async (idTurnamen, userId) => {
  const { data, error } = await supabaseAdmin
    .from('turnamen')
    .select('*')
    .eq('id_turnamen', idTurnamen)
    .maybeSingle();

  fail(error);

  if (!data) {
    return {
      status: 404,
      message: 'Turnamen tidak ditemukan.',
    };
  }

  if (data.id_pemilik !== userId) {
    return {
      status: 403,
      message: 'Hanya pemilik turnamen yang dapat melakukan aksi ini.',
    };
  }

  return { data };
};

const listTurnamen = async (
  req,
  res,
  { hanyaAktif = false, hanyaSelesai = false } = {},
) => {
  try {
    const search = req.query.search?.trim().toLowerCase() ?? '';
    const status = req.query.status;

    let query = supabaseAdmin
      .from('turnamen')
      .select('*')
      .order('tanggal_mulai', { ascending: false });

    // Turnamen aktif = status belum Selesai.
    if (hanyaAktif) {
      query = query.neq('status', 'Selesai');
    } else if (hanyaSelesai) {
      query = query.eq('status', 'Selesai');
    } else if (status && status !== 'Semua') {
      query = query.eq('status', status);
    }

    const { data: turnamenList, error } = await query;

    fail(error);

    const turnamenDenganPemilik = await attachUsernamePemilik(
      turnamenList ?? [],
    );

    // Pencarian berdasarkan nama turnamen atau username pemilik.
    const hasil = !search
      ? turnamenDenganPemilik
      : turnamenDenganPemilik.filter((turnamen) => {
          const namaTurnamen =
            turnamen.nama_turnamen?.toLowerCase() ?? '';

          const usernamePemilik =
            turnamen.username_pemilik?.toLowerCase() ?? '';

          return (
            namaTurnamen.includes(search) ||
            usernamePemilik.includes(search)
          );
        });

    return res.json(successResponse({ data: hasil }));
  } catch (error) {
    console.error('Error listTurnamen:', error);

    return res.status(500).json(
      errorResponse({
        message: error.message || 'Gagal mengambil data turnamen.',
      }),
    );
  }
};

export const createTurnamen = async (req, res) => {
  let idTurnamen;

  try {
    const {
      nama_turnamen,
      deskripsi,
      format_bracket = 'Single Elimination',
      tanggal_mulai,
      kuota,
      user_ids = [],
    } = req.body;

    const kuotaNumber = Number(kuota);
    const uniqueUserIds = [...new Set(user_ids)];

    if (!nama_turnamen?.trim() || !Number.isInteger(kuotaNumber)) {
      return res.status(400).json(
        errorResponse({
          message: 'Nama turnamen dan kuota wajib diisi.',
        }),
      );
    }

    if (kuotaNumber < 2) {
      return res.status(400).json(
        errorResponse({
          message: 'Kuota turnamen minimal 2 pengguna.',
        }),
      );
    }

    if (uniqueUserIds.length < 2 || uniqueUserIds.length > kuotaNumber) {
      return res.status(400).json(
        errorResponse({
          message:
            'Pilih minimal 2 akun dan jumlahnya tidak boleh melebihi kuota.',
        }),
      );
    }

    const { data: users, error: usersError } = await supabaseAdmin
      .from('user')
      .select('id')
      .in('id', uniqueUserIds);

    fail(usersError);

    if ((users ?? []).length !== uniqueUserIds.length) {
      return res.status(400).json(
        errorResponse({
          message: 'Ada akun pengguna yang tidak ditemukan.',
        }),
      );
    }

    idTurnamen = uuidv4();

    const { data: turnamen, error: turnamenError } = await supabaseAdmin
      .from('turnamen')
      .insert({
        id_turnamen: idTurnamen,
        id_pemilik: req.user.id,
        nama_turnamen: nama_turnamen.trim(),
        deskripsi: deskripsi?.trim() || null,
        format_bracket,
        tanggal_mulai: tanggal_mulai || new Date().toISOString(),
        kuota: kuotaNumber,
        status: 'Akan Datang',
      })
      .select()
      .single();

    fail(turnamenError);

    const matches = makeMatches(
      idTurnamen,
      uniqueUserIds,
      format_bracket,
    );

    if (matches.length > 0) {
      const { error: matchError } = await supabaseAdmin
        .from('pertandingan')
        .insert(matches);

      fail(matchError);
    }

    const [turnamenDenganPemilik] = await attachUsernamePemilik([
      turnamen,
    ]);

    return res.status(201).json(
      successResponse({
        message: 'Turnamen dan pertandingan awal berhasil dibuat.',
        data: turnamenDenganPemilik,
      }),
    );
  } catch (error) {
    console.error('Error createTurnamen:', error);

    // Jika insert pertandingan gagal, hapus turnamen yang tadi terbuat.
    if (idTurnamen) {
      await supabaseAdmin
        .from('pertandingan')
        .delete()
        .eq('id_turnamen', idTurnamen);

      await supabaseAdmin
        .from('turnamen')
        .delete()
        .eq('id_turnamen', idTurnamen);
    }

    return res.status(500).json(
      errorResponse({
        message: error.message || 'Gagal membuat turnamen.',
      }),
    );
  }
};

export const getAllTurnamen = async (req, res) => {
  return listTurnamen(req, res);
};

export const getTurnamenAktif = async (req, res) => {
  return listTurnamen(req, res, { hanyaAktif: true });
};

export const getRiwayatTurnamen = async (req, res) => {
  return listTurnamen(req, res, { hanyaSelesai: true });
};

export const getTurnamenById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: turnamen, error } = await supabaseAdmin
      .from('turnamen')
      .select('*')
      .eq('id_turnamen', id)
      .maybeSingle();

    fail(error);

    if (!turnamen) {
      return res.status(404).json(
        errorResponse({
          message: 'Turnamen tidak ditemukan.',
        }),
      );
    }

    const [turnamenDenganPemilik] = await attachUsernamePemilik([
      turnamen,
    ]);

    return res.json(
      successResponse({
        data: turnamenDenganPemilik,
      }),
    );
  } catch (error) {
    console.error('Error getTurnamenById:', error);

    return res.status(500).json(
      errorResponse({
        message: error.message || 'Gagal mengambil detail turnamen.',
      }),
    );
  }
};

// Cari akun berdasarkan username dari tabel Supabase "user".
export const cariUsername = async (req, res) => {
  try {
    const search = req.query.search?.trim();

    if (!search) {
      return res.status(400).json(
        errorResponse({
          message: 'Parameter search wajib diisi.',
        }),
      );
    }

    const { data, error } = await supabaseAdmin
      .from('user')
      .select('id, username, avatar_index')
      .ilike('username', `%${search}%`)
      .order('username', { ascending: true })
      .limit(20);

    fail(error);

    return res.json(successResponse({ data: data ?? [] }));
  } catch (error) {
    console.error('Error cariUsername:', error);

    return res.status(500).json(
      errorResponse({
        message: error.message || 'Gagal mencari username.',
      }),
    );
  }
};

export const updateTurnamen = async (req, res) => {
  try {
    const allowed = await ownerOnly(req.params.id, req.user.id);

    if (!allowed.data) {
      return res.status(allowed.status).json(
        errorResponse({
          message: allowed.message,
        }),
      );
    }

    const {
      nama_turnamen,
      deskripsi,
      format_bracket,
      tanggal_mulai,
      kuota,
      status,
    } = req.body;

    const updatedKuota =
      kuota !== undefined ? Number(kuota) : allowed.data.kuota;

    if (!Number.isInteger(updatedKuota) || updatedKuota < 2) {
      return res.status(400).json(
        errorResponse({
          message: 'Kuota turnamen minimal 2 pengguna.',
        }),
      );
    }

    const { data, error } = await supabaseAdmin
      .from('turnamen')
      .update({
        nama_turnamen:
          nama_turnamen?.trim() || allowed.data.nama_turnamen,
        deskripsi:
          deskripsi !== undefined
            ? deskripsi?.trim() || null
            : allowed.data.deskripsi,
        format_bracket:
          format_bracket || allowed.data.format_bracket,
        tanggal_mulai:
          tanggal_mulai || allowed.data.tanggal_mulai,
        kuota: updatedKuota,
        status: status || allowed.data.status,
      })
      .eq('id_turnamen', req.params.id)
      .select()
      .single();

    fail(error);

    const [turnamenDenganPemilik] = await attachUsernamePemilik([
      data,
    ]);

    return res.json(
      successResponse({
        message: 'Turnamen berhasil diperbarui.',
        data: turnamenDenganPemilik,
      }),
    );
  } catch (error) {
    console.error('Error updateTurnamen:', error);

    return res.status(500).json(
      errorResponse({
        message: error.message || 'Gagal memperbarui turnamen.',
      }),
    );
  }
};

export const deleteTurnamen = async (req, res) => {
  try {
    const allowed = await ownerOnly(req.params.id, req.user.id);

    if (!allowed.data) {
      return res.status(allowed.status).json(
        errorResponse({
          message: allowed.message,
        }),
      );
    }

    const { error } = await supabaseAdmin
      .from('turnamen')
      .delete()
      .eq('id_turnamen', req.params.id);

    fail(error);

    return res.json(
      successResponse({
        message: 'Turnamen berhasil dihapus.',
      }),
    );
  } catch (error) {
    console.error('Error deleteTurnamen:', error);

    return res.status(500).json(
      errorResponse({
        message: error.message || 'Gagal menghapus turnamen.',
      }),
    );
  }
};