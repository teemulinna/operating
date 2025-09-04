import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { specs } from './utils/swagger';
import { requestLogger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

// Routes
import employeeRoutes from './routes/employeeRoutes';
import departmentRoutes from './routes/departmentRoutes';
import skillRoutes from './routes/skillRoutes';
import authRoutes from './routes/authRoutes';
import bulkRoutes from './routes/bulkRoutes';
import searchRoutes from './routes/searchRoutes';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/search', searchRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;