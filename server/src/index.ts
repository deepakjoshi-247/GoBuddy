import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDb } from './db';
import authRoutes from './routes/auth';
import ridesRoutes from './routes/rides';
import requestsRoutes from './routes/requests';
import walletRoutes from './routes/wallet';
import chatRoutes from './routes/chat';
import resetRoutes from './routes/reset';
import logsRoutes from './routes/logs';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reset', resetRoutes);
app.use('/api/logs', logsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: 'ChaloNa API', timestamp: Date.now() });
});

// Serve client in production if built
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexHtml = path.join(clientDist, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      res.status(404).send('ChaloNa API is running. Client not yet built.');
    }
  });
});

async function startServer() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`🚀 ChaloNa Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
