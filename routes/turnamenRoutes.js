import express from 'express';
import {
  createTurnamen,
  getAllTurnamen,
  getTurnamenAktif,
  getRiwayatTurnamen,
  getTurnamenById,
  updateTurnamen,
  deleteTurnamen
} from '../controllers/TurnamenController.js';

const router = express.Router();

router.post('/', createTurnamen);
router.get('/', getAllTurnamen);
router.get('/aktif', getTurnamenAktif);
router.get('/riwayat', getRiwayatTurnamen);
router.get('/:id', getTurnamenById);
router.put('/:id', updateTurnamen);
router.delete('/:id', deleteTurnamen);

export default router;
