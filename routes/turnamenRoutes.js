// backend/routes/turnamenRoutes.js

import express from 'express';
import {
  createTurnamen,
  getAllTurnamen,
  getTurnamenAktif,
  getRiwayatTurnamen,
  getTurnamenById,
  updateTurnamen,
  deleteTurnamen,
} from '../controllers/TurnamenController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getAllTurnamen);
router.get('/aktif', getTurnamenAktif);
router.get('/riwayat', getRiwayatTurnamen);
router.get('/:id', getTurnamenById);

router.post('/', requireAuth, createTurnamen);
router.put('/:id', requireAuth, updateTurnamen);
router.delete('/:id', requireAuth, deleteTurnamen);

export default router;