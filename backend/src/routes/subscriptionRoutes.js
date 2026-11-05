import { Router } from 'express';
import { PLANS } from '../../../shared/src/flags.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

// Consultar el plan y las flags activas del gimnasio
router.get('/my-plan', requireAuth, (req, res) => {
  const planKey = (req.user?.planId || 'starter').toUpperCase();
  const plan = PLANS[planKey] || PLANS.STARTER;

  res.json({
    gimnasioId: req.user.gimnasioId,
    plan: plan.id,
    planName: plan.name,
    features: plan.features,
    limits: plan.limits
  });
});

// Listado de planes disponibles (para mostrar tabla de pricing)
router.get('/catalog', (req, res) => {
  res.json({
    plans: Object.values(PLANS)
  });
});

export default router;

