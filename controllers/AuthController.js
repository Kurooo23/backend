import { supabase, supabaseAdmin } from '../config/db.js';
import { successResponse, errorResponse } from '../models/apiResponse.js';

const validPassword = (password) =>
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /[0-9]/.test(password) &&
  /[@#$!_-]/.test(password);

export const register = async (req, res) => {
  try {
    const { email, password, nickname, avatar_index = 0 } = req.body;
    const username = nickname?.trim();
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !username || !password) {
      return res.status(400).json(
        errorResponse({ message: 'Email, nickname, dan kata sandi wajib diisi.' }),
      );
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json(
        errorResponse({
          message: 'Nickname harus 3–20 karakter dan hanya boleh huruf, angka, atau underscore.',
        }),
      );
    }

    if (!validPassword(password)) {
      return res.status(400).json(
        errorResponse({
          message: 'Kata sandi minimal 8 karakter serta wajib memiliki huruf besar, huruf kecil, angka, dan simbol (@ # $ ! _ -).',
        }),
      );
    }

    const { data: nicknameUsed, error: nicknameError } = await supabaseAdmin
      .from('user')
      .select('id')
      .ilike('username', username)
      .maybeSingle();

    if (nicknameError) throw nicknameError;

    if (nicknameUsed) {
      return res.status(400).json(
        errorResponse({ message: 'Nickname sudah digunakan.' }),
      );
    }

    const options = {
      data: {
        username,
        avatar_index: Number(avatar_index) || 0,
      },
    };

    if (process.env.EMAIL_REDIRECT_URL) {
      options.emailRedirectTo = process.env.EMAIL_REDIRECT_URL;
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options,
    });

    if (error) {
      return res.status(400).json(errorResponse({ message: error.message }));
    }

    if (!data.user || data.user.identities?.length === 0) {
      return res.status(400).json(
        errorResponse({ message: 'Email sudah terdaftar.' }),
      );
    }

    const { error: profileError } = await supabaseAdmin.from('user').insert({
      id: data.user.id,
      username,
      avatar_index: Number(avatar_index) || 0,
    });

    if (profileError) throw profileError;

    return res.status(201).json(
      successResponse({
        message: 'Pendaftaran berhasil. Silakan verifikasi email Anda.',
        data: {
          user: {
            id_user: data.user.id,
            email: normalizedEmail,
            nickname: username,
            avatar_index: Number(avatar_index) || 0,
          },
        },
      }),
    );
  } catch (error) {
    return res.status(500).json(
      errorResponse({ message: error.message || 'Pendaftaran gagal.' }),
    );
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email?.trim().toLowerCase(),
      password,
    });

    if (error || !data.session || !data.user) {
      return res.status(401).json(
        errorResponse({
          message: 'Email atau password salah. Pastikan email sudah diverifikasi.',
        }),
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) throw profileError;

    return res.json(
      successResponse({
        message: 'Login berhasil.',
        data: {
          token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          user: {
            id_user: data.user.id,
            email: data.user.email,
            nickname: profile.username,
            avatar_index: profile.avatar_index,
          },
        },
      }),
    );
  } catch (error) {
    return res.status(500).json(
      errorResponse({ message: error.message || 'Login gagal.' }),
    );
  }
};