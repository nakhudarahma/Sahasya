import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
// Import error handler middleware
import { errorHandler } from './common/middlewares/error.middleware';

// Module Routers
import authRouter from './modules/auth/auth.route';
import emergencyRouter from './modules/emergency/emergency.route';
import safetyRouter from './modules/safety/safety.route';
import routesRouter from './modules/routes/routes.route';
import evidenceRouter from './modules/evidence/evidence.route';
import aiRouter from './modules/ai/ai.route';
import reportingRouter from './modules/reporting/reporting.route';

const app: Express = express();

// Security Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root Route
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ 
    message: 'Welcome to SAHAS API', 
    version: '1.0.0',
    healthCheck: '/health',
    status: 'Running' 
  });
});

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'SAHAS API is running', timestamp: new Date().toISOString() });
});

// Modular Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/emergency', emergencyRouter);
app.use('/api/v1/safety', safetyRouter);
app.use('/api/v1/routes', routesRouter);
app.use('/api/v1/evidence', evidenceRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/reports', reportingRouter);

// Unknown Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint Not Found' });
});

// Global Error Handler
app.use(errorHandler as any);

export default app;
