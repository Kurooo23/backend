// backend/routes/authRoutes.js

import express from 'express';
import {
  register,
  login,
  resendVerification,
} from '../controllers/AuthController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/resend-verification', resendVerification);

export default router;