import { Router } from 'express';
import { PLANS } from '../../../shared/src/flags.js';

const router = Router();

// Registro de nuevo gimnasio (Tenant)
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Nombre y email requeridos' });
  }

  // Respuesta simulada de alta de nuevo tenant con 14 días de prueba
  res.status(201).json({
    message: 'Gimnasio registrado correctamente',
    gimnasio: {
      id: 'gimnasio-' + Date.now(),
      name,
      email,
      plan: 'pro', // Trial con acceso Pro
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    },
    token: 'mock-jwt-token-preview'
  });
});

// Login
router.post('/login', async (req, res) => {
  const { email } = req.body;
  res.json({
    token: 'mock-jwt-token-preview',
    gimnasio: {
      id: 'gimnasio-default',
      name: 'Mi Dojo / Gimnasio',
      email: email || 'admin@gimnasio.com',
      plan: 'pro',
      status: 'active'
    },
    planDetails: PLANS.PRO
  });
});

export default router;
