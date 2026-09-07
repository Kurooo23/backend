// backend/controllers/PertandinganController.js

import { supabaseAdmin } from '../config/db.js';
import { successResponse, errorResponse } from '../models/apiResponse.js';

const fail = (error) => {
  if (error) throw error;
};

const withUserNames = async (matches) => {
  const ids = [
    ...new Set(
      matches.flatMap((match) => [match.id_user_1, match.id_user_2]).filter(Boolean),
    ),
  ];

  if (ids.length === 0) return matches;

  const { data: users, error } = await supabaseAdmin
    .from('user')
    .select('id, username')
    .in('id', ids);

  fail(error);

  const names = Object.fromEntries(users.map((user) => [user.id, user.username]));

  return matches.map((match) => ({
    ...match,
    nama_user_1: names[match.id_user_1] ?? null,
    nama_user_2: names[match.id_user_2] ?? null,
  }));
};

export const getPertandinganByTurnamen = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pertandingan')
      .select('*')
      .eq('id_turnamen', req.params.idTurnamen)
      .order('babak');

    fail(error);

    return res.json(successResponse({ data: await withUserNames(data) }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message }));
  }
};

export const getPertandinganById = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pertandingan')
      .select('*')
      .eq('id_pertandingan', req.params.id)
      .maybeSingle();

    fail(error);

    if (!data) {
      return res.status(404).json(
        errorResponse({ message: 'Pertandingan tidak ditemukan.' }),
      );
    }

    return res.json(successResponse({ data: (await withUserNames([data]))[0] }));
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message }));
  }
};

export const updateSkorPertandingan = async (req, res) => {
  try {
    const { data: match, error: matchError } = await supabaseAdmin
      .from('pertandingan')
      .select('*, turnamen(id_pemilik)')
      .eq('id_pertandingan', req.params.id)
      .maybeSingle();

    fail(matchError);

    if (!match) {
      return res.status(404).json(
        errorResponse({ message: 'Pertandingan tidak ditemukan.' }),
      );
    }

    if (match.turnamen.id_pemilik !== req.user.id) {
      return res.status(403).json(
        errorResponse({
          message: 'Hanya pemilik turnamen yang dapat memasukkan skor.',
        }),
      );
    }

    const skor1 = Number(req.body.skor_user_1);
    const skor2 = Number(req.body.skor_user_2);

    if (!Number.isInteger(skor1) || !Number.isInteger(skor2) || skor1 < 0 || skor2 < 0) {
      return res.status(400).json(
        errorResponse({ message: 'Skor harus berupa angka nol atau lebih.' }),
      );
    }

    const { data, error } = await supabaseAdmin
      .from('pertandingan')
      .update({
        skor_user_1: skor1,
        skor_user_2: skor2,
        status: req.body.status || 'Selesai',
      })
      .eq('id_pertandingan', req.params.id)
      .select()
      .single();

    fail(error);

    return res.json(
      successResponse({
        message: 'Skor pertandingan berhasil diperbarui.',
        data,
      }),
    );
  } catch (error) {
    return res.status(500).json(errorResponse({ message: error.message }));
  }
};