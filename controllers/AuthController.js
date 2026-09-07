import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/db.js';
import { successResponse, errorResponse } from '../models/apiResponse.js';

export const register = async (req, res) => {
  try {
    const { email, password, nickname, avatar_index = 0 } = req.body;

    if (!email || !password || !nickname) {
      return res.status(400).json(errorResponse({
        message: 'Email, password, dan nickname wajib diisi.'
      }));
    }

    // Cek apakah email sudah terdaftar di SQLite
    const existingUser = db.prepare('SELECT id_user FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (existingUser) {
      return res.status(400).json(errorResponse({
        message: 'Email sudah terdaftar. Silakan gunakan email lain atau langsung masuk.'
      }));
    }

    const id_user = uuidv4();
    const hashedPassword = bcrypt.hashSync(password, 10);
    const createdAt = new Date().toISOString();
    const avatarIdx = Number(avatar_index) || 0;

    // Simpan ke SQLite
    db.prepare(`
      INSERT INTO users (id_user, email, password, nickname, avatar_index, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id_user, email.trim().toLowerCase(), hashedPassword, nickname.trim(), avatarIdx, createdAt);

    const createdUser = {
      id_user,
      email: email.trim().toLowerCase(),
      nickname: nickname.trim(),
      avatar_index: avatarIdx,
      created_at: createdAt
    };

    return res.status(201).json(successResponse({
      message: 'Pendaftaran berhasil! Silakan masuk.',
      data: { user: createdUser }
    }));
  } catch (error) {
    console.error('Error register:', error);
    return res.status(500).json(errorResponse({
      message: error.message || 'Terjadi kesalahan saat mendaftar.'
    }));
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json(errorResponse({
        message: 'Email dan password wajib diisi.'
      }));
    }

    // Cari user berdasarkan email
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (!user) {
      return res.status(401).json(errorResponse({
        message: 'Email atau password salah.'
      }));
    }

    // Verifikasi password
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json(errorResponse({
        message: 'Email atau password salah.'
      }));
    }

    // Generate JWT token
    const secret = process.env.JWT_SECRET || 'rivnet_secret_key_2026';
    const token = jwt.sign(
      {
        id_user: user.id_user,
        email: user.email,
        nickname: user.nickname
      },
      secret,
      { expiresIn: '30d' }
    );

    const userData = {
      id_user: user.id_user,
      email: user.email,
      nickname: user.nickname,
      avatar_index: user.avatar_index
    };

    return res.json({
      success: true,
      status: 'success',
      message: 'Login berhasil',
      token,
      data: {
        token,
        user: userData
      }
    });
  } catch (error) {
    console.error('Error login:', error);
    return res.status(500).json(errorResponse({
      message: error.message || 'Terjadi kesalahan saat login.'
    }));
  }
};
