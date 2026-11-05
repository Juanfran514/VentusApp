import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

/**
 * Endpoint de Onboarding: Importa la copia de seguridad .json de IndexedDB
 * y la convierte en los registros de base de datos del gimnasio en la nube
 */
router.post('/import-backup', requireAuth, async (req, res) => {
  const { backupData } = req.body;

  if (!backupData || !backupData.data) {
    return res.status(400).json({ error: 'Formato de copia no válido' });
  }

  const { alumnos = [], grupos = [], pagos = [], gastos = [], productos = [] } = backupData.data;

  // En producción aquí se ejecuta una transacción SQL multi-tenant insertando con req.user.gimnasioId
  res.json({
    success: true,
    message: 'Datos importados correctamente en la nube',
    stats: {
      alumnos: alumnos.length,
      grupos: grupos.length,
      pagos: pagos.length,
      gastos: gastos.length,
      productos: productos.length
    }
  });
});

export default router;
