import { supabase, supabaseAdmin } from '../config/db.js';
import { errorResponse } from '../models/apiResponse.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization ?? '';
    const token = authorization.startsWith('Bearer ')
      ? authorization.substring(7)
      : null;

    if (!token) {
      return res.status(401).json(
        errorResponse({ message: 'Token login wajib dikirim.' }),
      );
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json(
        errorResponse({ message: 'Token tidak valid atau sudah berakhir.' }),
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(401).json(
        errorResponse({ message: 'Profil pengguna tidak ditemukan.' }),
      );
    }

    req.user = {
      id: data.user.id,
      email: data.user.email,
      username: profile.username,
      avatar_index: profile.avatar_index,
    };

    next();
  } catch (_) {
    return res.status(401).json(
      errorResponse({ message: 'Autentikasi gagal.' }),
    );
  }
};