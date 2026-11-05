/**
 * Middleware para validar el token JWT y extraer el tenant (gimnasioId)
 */
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Token de autorización requerido'
    });
  }

  const token = authHeader.split(' ')[1];

  // Mock de verificación para desarrollo inicial (se reemplaza por jwt.verify)
  try {
    // payload simulado durante setup inicial
    req.user = {
      id: 'mock-user-1',
      gimnasioId: req.headers['x-gimnasio-id'] || 'mock-gimnasio-id',
      email: 'admin@gimnasio.com',
      role: 'admin',
      planId: 'pro'
    };
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Sesión inválida o caducada'
    });
  }
};
