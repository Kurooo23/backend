// backend/controllers/TurnamenController.js

import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/db.js';
import { successResponse, errorResponse } from '../models/apiResponse.js';

const fail = (error) => {
  if (error) throw error;
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

  if (!data) return { status: 404, message: 'Turnamen tidak ditemukan.' };
  if (data.id_pemilik !== userId) {
    return { status: 403, message: 'Hanya pemilik turnamen yang dapat melakukan aksi ini.' };
  }

  return { data };
};

export const createTurnamen = async (req, res) => {
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
        errorResponse({ message: 'Nama turnamen dan kuota wajib diisi.' }),
      );
    }

    if (uniqueUserIds.length < 2 || uniqueUserIds.length > kuotaNumber) {
      return res.status(400).json(
        errorResponse({
          message: 'Pilih minimal 2 akun dan jumlahnya tidak boleh melebihi kuota.',
        }),
      );
    }

    const { data: users, error: usersError } = await supabaseAdmin
      .from('user')
      .select('id')
      .in('id', uniqueUserIds);

    fail(usersError);

    if (users.length !== uniqueUserIds.length) {
      return res.status(400).json(
        errorResponse({ message: 'Ada akun peserta yang tidak ditemukan.' }),
      );
    }

    const idTurnamen = uuidv4();

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

    const matches = makeMatches(idTurnamen, uniqueUserIds, format_bracket);

    if (matches.length > 0) {
      const { error: matchError } = await supabaseAdmin
        .from('pertandingan')
        .insert(matches);

      fail(matchError);
    }

    return res.status(201).json(
      successResponse({
        message: 'Turnamen dan pertandingan awal berhasil dibuat.',
        data: turnamen,
      }),
    );
  } catch (error) {
    return res.status(500).json(
      errorResponse({ message: error.message || 'Gagal membuat turnamen.' }),
    );
  }
};

export const getAllTurnamen = async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('turnamen')
      .select('*')
      .order('tanggal_mulai', { ascending: false });

    if (req.query.search) {
      query = query.ilike('nama_turnamen', `%${req.query.search}%`);
    }

    if (req.query.status && req.query.status !== 'Semua') {
      query = query.eq('status', req.query.status);
    }

    const { data, error } = await query;
    fail(error);

    return res.json(successResponse({ data }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message }));
  }
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
        errorResponse({ message: 'Turnamen tidak ditemukan.' }),
      );
    }

    return res.json(successResponse({ data: turnamen }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message }));
  }
};

export const getTurnamenAktif = async (req, res) => {
  req.query.status = 'Berlangsung';
  return getAllTurnamen(req, res);
};

export const getRiwayatTurnamen = async (req, res) => {
  req.query.status = 'Selesai';
  return getAllTurnamen(req, res);
};

export const updateTurnamen = async (req, res) => {
  try {
    const allowed = await ownerOnly(req.params.id, req.user.id);

    if (!allowed.data) {
      return res.status(allowed.status).json(errorResponse({ message: allowed.message }));
    }

    const { nama_turnamen, deskripsi, format_bracket, tanggal_mulai, kuota, status } =
      req.body;

    const { data, error } = await supabaseAdmin
      .from('turnamen')
      .update({
        nama_turnamen: nama_turnamen?.trim() || allowed.data.nama_turnamen,
        deskripsi: deskripsi !== undefined ? deskripsi?.trim() || null : allowed.data.deskripsi,
        format_bracket: format_bracket || allowed.data.format_bracket,
        tanggal_mulai: tanggal_mulai || allowed.data.tanggal_mulai,
        kuota: kuota ? Number(kuota) : allowed.data.kuota,
        status: status || allowed.data.status,
      })
      .eq('id_turnamen', req.params.id)
      .select()
      .single();

    fail(error);

    return res.json(
      successResponse({ message: 'Turnamen berhasil diperbarui.', data }),
    );
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message }));
  }
};

export const deleteTurnamen = async (req, res) => {
  try {
    const allowed = await ownerOnly(req.params.id, req.user.id);

    if (!allowed.data) {
      return res.status(allowed.status).json(errorResponse({ message: allowed.message }));
    }

    const { error } = await supabaseAdmin
      .from('turnamen')
      .delete()
      .eq('id_turnamen', req.params.id);

    fail(error);

    return res.json(successResponse({ message: 'Turnamen berhasil dihapus.' }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message }));
  }
};