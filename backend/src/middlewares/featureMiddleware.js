import { PLANS } from '../../../shared/src/flags.js';

/**
 * Middleware para proteger endpoints según las feature flags del plan del gimnasio
 */
export const requireFeature = (featureKey) => {
  return (req, res, next) => {
    const userPlanId = (req.user?.planId || 'starter').toUpperCase();
    const plan = PLANS[userPlanId] || PLANS.STARTER;

    const hasFeature = Boolean(plan.features?.[featureKey]);

    if (!hasFeature) {
      return res.status(403).json({
        error: 'FEATURE_NOT_IN_PLAN',
        feature: featureKey,
        currentPlan: plan.id,
        message: `Esta función requiere actualizar al Plan Pro o Elite.`
      });
    }

    next();
  };
};

/**
 * Middleware para validar límites de consumo numéricos (ej. alumnos activos)
 */
export const checkUsageLimit = (limitKey, getCurrentCountFn) => {
  return async (req, res, next) => {
    const userPlanId = (req.user?.planId || 'starter').toUpperCase();
    const plan = PLANS[userPlanId] || PLANS.STARTER;

    const maxLimit = plan.limits?.[limitKey] ?? 0;

    // -1 significa ilimitado
    if (maxLimit === -1) {
      return next();
    }

    const currentCount = await getCurrentCountFn(req);

    if (currentCount >= maxLimit) {
      return res.status(403).json({
        error: 'USAGE_LIMIT_REACHED',
        limit: limitKey,
        current: currentCount,
        max: maxLimit,
        message: `Has alcanzado el límite de ${maxLimit} de tu plan actual.`
      });
    }

    next();
  };
};
