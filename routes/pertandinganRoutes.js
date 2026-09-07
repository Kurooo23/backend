import express from 'express';
import {
  getPertandinganByTurnamen,
  getPertandinganById,
  updateSkorPertandingan
} from '../controllers/PertandinganController.js';

const router = express.Router();

router.get('/turnamen/:idTurnamen', getPertandinganByTurnamen);
router.get('/:id', getPertandinganById);
router.put('/:id/skor', updateSkorPertandingan);

export default router;
