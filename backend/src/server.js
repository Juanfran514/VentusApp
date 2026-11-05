import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import authRoutes from './routes/authRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import syncRoutes from './routes/syncRoutes.js';

const app = express();

app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: '15mb' })); // Permite subir fotos y backups

// Rutas de API
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/sync', syncRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ventus-api', timestamp: new Date().toISOString() });
});

app.listen(config.port, () => {
  console.log(`🚀 VentusApp Backend API escuchando en http://localhost:${config.port}`);
});
