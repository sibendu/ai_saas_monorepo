import './lib/load-env';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import customersRouter from './routes/customers';
import dashboardRouter from './routes/dashboard';
import rolesRouter from './routes/roles';
import tasksRouter from './routes/tasks';

const app: Express = express();
const PORT = process.env.PORT || 3001;

function isTestRuntime(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
}

// Middleware
app.use(helmet()); // Security headers
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies

// CORS configuration
// In production, restrict this to your Next.js app's domain
app.use(cors({
  origin: process.env.WEB_APP_URL || 'http://localhost:3000',
  credentials: true,
}));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    service: 'bff',
    timestamp: new Date().toISOString() 
  });
});

// Routes
app.use('/api', customersRouter);
app.use('/api', dashboardRouter);
app.use('/api', rolesRouter);
app.use('/api', tasksRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found' 
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
if (!isTestRuntime()) {
  app.listen(PORT, () => {
    console.log(`🚀 BFF server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`👥 Customers API: http://localhost:${PORT}/api/customers`);
    console.log(`🗂️ Tasks API: http://localhost:${PORT}/api/tasks`);
  });
}

export default app;
