import { supabase, supabaseAdmin } from '../config/db.js';
import { successResponse, errorResponse } from '../models/apiResponse.js';

const NICKNAME_MIN = 3;
const NICKNAME_MAX = 20;
const SUFFIX_LENGTH = 4;

// Di ILIKE, "_" dan "%" adalah wildcard. Di-escape supaya nickname dicocokkan
// persis (tanpa beda huruf besar-kecil), bukan sebagai pola.
const escapeLike = (value) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

const randomSuffix = () =>
  String(Math.floor(10 ** (SUFFIX_LENGTH - 1) + Math.random() * 9 * 10 ** (SUFFIX_LENGTH - 1)));

// Nickname awal dari nama Google, atau bagian depan email kalau nama tidak
// bisa dipakai. Hasilnya ikut aturan register: 3-20 karakter, hanya huruf,
// angka, dan underscore.
const nicknameBaseFrom = (user) => {
  const sources = [
    user.user_metadata?.full_name,
    user.user_metadata?.name,
    user.email?.split('@')[0],
  ];

  for (const source of sources) {
    const cleaned = (source ?? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, NICKNAME_MAX);

    if (cleaned.length >= NICKNAME_MIN) return cleaned;
  }

  return 'gamer';
};

const isNicknameTaken = async (nickname) => {
  const { data, error } = await supabaseAdmin
    .from('user')
    .select('id')
    .ilike('username', escapeLike(nickname))
    .limit(1);

  if (error) throw error;
  return data.length > 0;
};

const findProfile = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('user')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

// Login Google pertama belum punya baris di tabel user: dibuat dengan
// nickname otomatis dan avatar 0.
const createProfile = async (user) => {
  const base = nicknameBaseFrom(user);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    // Kalau sudah dipakai, potong lalu tambah angka acak supaya tetap 20.
    const nickname =
      attempt === 0
        ? base
        : `${base.slice(0, NICKNAME_MAX - SUFFIX_LENGTH)}${randomSuffix()}`;
    if (await isNicknameTaken(nickname)) continue;

    const { data, error } = await supabaseAdmin
      .from('user')
      .insert({ id: user.id, username: nickname, avatar_index: 0 })
      .select()
      .single();

    if (!error) return data;

    // 23505 = data kembar: profil ini baru saja dibuat oleh request lain
    // (misalnya tombol ditekan dua kali), atau nickname-nya keburu dipakai.
    if (error.code !== '23505') throw error;

    const profile = await findProfile(user.id);
    if (profile) return profile;
  }

  throw new Error('Gagal membuat nickname untuk akun Google. Coba lagi.');
};

export const googleLogin = async (req, res) => {
  try {
    const idToken = req.body?.id_token;

    if (typeof idToken !== 'string' || idToken.length === 0) {
      return res.status(400).json(
        errorResponse({ message: 'ID token Google wajib dikirim.' }),
      );
    }

    // Supabase memverifikasi ID token ke Google (tanda tangan, client ID,
    // masa berlaku), lalu membuat atau menautkan akun dan membuka sesi.
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error || !data?.session || !data?.user) {
      console.error('[google] signInWithIdToken gagal:', error?.message);
      return res.status(401).json(
        errorResponse({
          message: 'Login dengan Google gagal. Akun Google tidak dapat diverifikasi.',
        }),
      );
    }

    const profile =
      (await findProfile(data.user.id)) ?? (await createProfile(data.user));

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
      errorResponse({ message: error.message || 'Login dengan Google gagal.' }),
    );
  }
};