import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { connectDB } from './config/db.js';
import { initSocket } from './services/socketService.js';
import { seedDatabase } from './seed/seedData.js';
import RiskZone from './models/RiskZone.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startBackgroundSchedulers } from './services/schedulerService.js';
import { logVonageEnvStatus } from './services/smsGatewayService.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import riskZoneRoutes from './routes/riskZoneRoutes.js';
import sensorRoutes from './routes/sensorRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import citizenReportRoutes from './routes/citizenReportRoutes.js';
import fieldTaskRoutes from './routes/fieldTaskRoutes.js';
import sosRoutes from './routes/sosRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import demoRoutes from './routes/demoRoutes.js';
import externalDataRoutes from './routes/externalDataRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import pushRoutes from './routes/pushRoutes.js';
import telecomRoutes from './routes/telecomRoutes.js';
import historicalLandslideRoutes from './routes/historicalLandslideRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Dynamic CORS Allowed Origins Resolver
const getAllowedOrigins = () => {
  const envOrigins = process.env.CORS_ALLOWED_ORIGIN || process.env.CORS_ALLOWED_ORIGINS || process.env.CLIENT_URL;
  if (!envOrigins || envOrigins.trim() === '' || envOrigins.trim() === '*') {
    return '*';
  }
  return envOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);
};

const allowedOrigins = getAllowedOrigins();

const corsOriginDelegate = (origin, callback) => {
  // Allow non-browser requests (e.g. mobile apps, curl, server-to-server, health probes)
  if (!origin) return callback(null, true);
  if (allowedOrigins === '*' || (Array.isArray(allowedOrigins) && allowedOrigins.includes('*'))) {
    return callback(null, true);
  }
  if (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) {
    return callback(null, true);
  }
  // In development/test mode, also permit any localhost / 127.0.0.1 port
  if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return callback(null, true);
  }
  return callback(new Error(`Blocked by CORS policy: Origin ${origin} is not allowed.`));
};

// Initialize Socket.io
const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins === '*' ? '*' : allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: allowedOrigins !== '*',
  },
});
initSocket(io);

// Security & Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false, // Allows cross-origin map tiles / WebSockets in dev & prod
}));
app.use(cors({
  origin: allowedOrigins === '*' ? '*' : corsOriginDelegate,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-jurisdiction-district'],
  credentials: allowedOrigins !== '*',
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// 1. General API Rate Limiter (600 requests per 15 min per IP)
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many API requests from this IP. Please try again later.',
  },
});
app.use('/api/', generalApiLimiter);

// 2. Auth Endpoint Rate Limiter (10 requests per 15 min per IP for login/password reset)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// 3. Registration Rate Limiter (10 registrations per hour per IP)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Account creation rate limit exceeded. Please try again later.',
  },
});
app.use('/api/auth/register', registerLimiter);

// 4. AI Prediction & Simulation Rate Limiter (30 simulation triggers per 15 min)
const aiPredictionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'AI prediction simulation rate limit exceeded. Please wait a moment.',
  },
});
app.use('/api/demo', aiPredictionLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/risk-zones', riskZoneRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/citizen-reports', citizenReportRoutes);
app.use('/api/field-tasks', fieldTaskRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/external', externalDataRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/telecom', telecomRoutes);
app.use('/api/historical-landslides', historicalLandslideRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'RAKSHA-NER Government Emergency Operations Backend',
    version: '1.0.0',
    timestamp: new Date(),
    region: 'North East India (Meghalaya, Assam, Mizoram, Nagaland, Arunachal, Manipur, Tripura, Sikkim)',
  });
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start Server, Auto-Seed DB, and start Schedulers
const startServer = async () => {
  await connectDB();

  // Auto-seed if database is empty
  const count = await RiskZone.countDocuments();
  if (count === 0) {
    console.log('🔄 Initializing fresh database with North East India disaster demo dataset...');
    await seedDatabase();
  }

  // Start background schedulers for weather & satellite ingestion
  startBackgroundSchedulers();

  // Check and log Vonage Telecom Gateway credentials presence
  logVonageEnvStatus();

  server.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(`🛡️  RAKSHA-NER MULTI-HAZARD EARLY WARNING SYSTEM RUNNING`);
    console.log(`🌐  API Gateway:     http://localhost:${PORT}/api`);
    console.log(`⚡  Socket.IO:       ws://localhost:${PORT}`);
    console.log(`🛰️  Data Ingestion:  OpenWeatherMap + Sentinel-2 + GSI Schedulers Active`);
    console.log(`🚀  Health Check:    http://localhost:${PORT}/api/health`);
    console.log(`=============================================================\n`);
  });
};

startServer();
