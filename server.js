// backend/server.js

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import googleRoutes from './routes/googleRoutes.js';
import turnamenRoutes from './routes/turnamenRoutes.js';
import pertandinganRoutes from './routes/pertandinganRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/auth', googleRoutes); // POST /api/auth/google
app.use('/api/turnamen', turnamenRoutes);
app.use('/api/pertandingan', pertandinganRoutes);

app.get('/', (_, res) => {
  res.json({
    name: 'RivNet Turnamen API',
    status: 'running',
    storage: 'Supabase',
    endpoints: {
      auth: '/api/auth',
      turnamen: '/api/turnamen',
      pertandingan: '/api/pertandingan',
    },
  });
});

app.get('/auth/callback', (_, res) => {
  res.type('html').send(`
    <!doctype html>
    <html lang="id">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Verifikasi RivNet</title>
        <style>
          * { box-sizing: border-box; }

          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 24px;
            background: #0b1020;
            color: #f8fafc;
            font-family: Arial, sans-serif;
          }

          .card {
            width: min(100%, 460px);
            padding: 32px;
            text-align: center;
            border: 1px solid #2d3b59;
            border-radius: 20px;
            background: #141b2d;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
          }

          .icon {
            width: 64px;
            height: 64px;
            display: grid;
            place-items: center;
            margin: 0 auto 16px;
            border-radius: 50%;
            background: #0ea5e9;
            font-size: 30px;
          }

          .error .icon {
            background: #ef4444;
          }

          h1 {
            margin: 0 0 12px;
            font-size: 24px;
          }

          p {
            margin: 0;
            color: #b6c2d9;
            line-height: 1.6;
          }
        </style>
      </head>

      <body>
        <main class="card" id="card">
          <div class="icon" id="icon">⌛</div>
          <h1 id="title">Memverifikasi akun...</h1>
          <p id="message">Mohon tunggu sebentar.</p>
        </main>

        <script>
          const params = new URLSearchParams(window.location.hash.slice(1));

          const card = document.getElementById('card');
          const icon = document.getElementById('icon');
          const title = document.getElementById('title');
          const message = document.getElementById('message');

          if (params.has('error')) {
            card.classList.add('error');
            icon.textContent = '✕';
            title.textContent = 'Verifikasi tidak berhasil';

            message.textContent =
              params.get('error_code') === 'otp_expired'
                ? 'Tautan verifikasi sudah kedaluwarsa atau telah digunakan. Silakan minta tautan verifikasi baru.'
                : 'Tautan verifikasi tidak valid. Silakan minta tautan verifikasi baru.';
          } else if (params.has('access_token')) {
            icon.textContent = '✓';
            title.textContent = 'Email berhasil diverifikasi';
            message.textContent =
              'Akun RivNet Anda sudah aktif. Silakan kembali ke aplikasi dan masuk.';
          } else {
            card.classList.add('error');
            icon.textContent = '!';
            title.textContent = 'Tautan tidak lengkap';
            message.textContent =
              'Silakan buka kembali tautan verifikasi terbaru dari email Anda.';
          }
        </script>
      </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
const NETWORK_IP = '192.168.100.56';

app.listen(PORT, '0.0.0.0', () => {
  console.log('Server RivNet Backend berjalan di:');
  console.log(`- Local: http://localhost:${PORT}`);
  console.log(`- Android Emulator: http://10.0.2.2:${PORT}`);
  console.log(`- Network/HP: http://${NETWORK_IP}:${PORT}`);
});