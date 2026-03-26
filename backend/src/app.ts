import express, { Request, Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import bodyParser from 'body-parser';
import { corsMiddleware } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import itemRoutes from './routes/item.routes';
import operationRoutes from './routes/operation.routes';
import reportRoutes from './routes/report.routes';
import groupRoutes from './routes/group.routes';
import syncRoutes from './routes/sync.routes';
import kitRoutes from './routes/kit.routes';
import donorRoutes from './routes/donor.routes';

const app = express();

// Security & compression
app.use(helmet());
app.use(corsMiddleware);
app.use(compression());

// Body parsing
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/operations', operationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/kits', kitRoutes);
app.use('/api/donors', donorRoutes);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'] ?? 'development',
  });
});

// 404 & error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
