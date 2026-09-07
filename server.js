// backend/server.js

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import turnamenRoutes from './routes/turnamenRoutes.js';
import pertandinganRoutes from './routes/pertandinganRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/turnamen', turnamenRoutes);
app.use('/api/pertandingan', pertandinganRoutes);

app.get('/', (_, res) => {
  res.json({
    name: 'RivNet Turnamen API',
    status: 'running',
    storage: 'Supabase',
  });
});

// Health Check & Documentation
app.get('/', (req, res) => {
  res.json({
    name: 'RivNet Turnamen API (Offline SQLite)',
    status: 'running',
    endpoints: {
      turnamen: '/api/turnamen',
      peserta: '/api/peserta',
      pertandingan: '/api/pertandingan'
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server RivNet Backend berjalan di:`);
  console.log(`- Local: http://localhost:${PORT}`);
  console.log(`- Android Emulator: http://10.0.2.2:${PORT}`);
  console.log(`- Network/HP: http://10.10.10.242:${PORT}`);
});
