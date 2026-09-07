// backend/routes/pertandinganRoutes.js

import express from 'express';
import {
  getPertandinganByTurnamen,
  getPertandinganById,
  updateSkorPertandingan,
} from '../controllers/PertandinganController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/turnamen/:idTurnamen', getPertandinganByTurnamen);
router.get('/:id', getPertandinganById);
router.put('/:id/skor', requireAuth, updateSkorPertandingan);

export default router;