import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDatabase } from './config/db.js';
import turnamenRoutes from './routes/turnamenRoutes.js';
import pesertaRoutes from './routes/pesertaRoutes.js';
import pertandinganRoutes from './routes/pertandinganRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Inisialisasi SQLite Table
initDatabase();

// Routes REST API Turnamen & Autentikasi
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes); // Alias
app.use('/api/turnamen', turnamenRoutes);
app.use('/api/peserta', pesertaRoutes);
app.use('/api/pertandingan', pertandinganRoutes);

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
