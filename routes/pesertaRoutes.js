import express from 'express';
import {
  getPesertaByTurnamen,
  createPeserta,
  deletePeserta
} from '../controllers/PesertaController.js';

const router = express.Router();

router.get('/turnamen/:idTurnamen', getPesertaByTurnamen);
router.post('/', createPeserta);
router.delete('/:id', deletePeserta);

export default router;
