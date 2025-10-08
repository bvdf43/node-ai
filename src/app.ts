/**
 * Advanced AGI System - Application Setup
 * 
 * This file sets up the Express application with all middleware,
 * routes, and integrations for the Advanced AGI System.
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Import middleware
import { errorHandler } from '@integration/apis/rest-api/middleware/error-handler';
import { rateLimiter } from '@integration/apis/rest-api/middleware/rate-limiter';
import { authMiddleware } from '@integration/apis/rest-api/middleware/auth-middleware';
import { requestLogger } from '@integration/apis/rest-api/middleware/request-logger';
import { validationMiddleware } from '@integration/apis/rest-api/middleware/validation-middleware';

// Import routes
import { agiRoutes } from '@integration/apis/rest-api/routes/agi-routes';
import { neuralRoutes } from '@integration/apis/rest-api/routes/neural-routes';
import { reasoningRoutes } from '@integration/apis/rest-api/routes/reasoning-routes';
import { codeIntelligenceRoutes } from '@integration/apis/rest-api/routes/code-intelligence-routes';
import { knowledgeRoutes } from '@integration/apis/rest-api/routes/knowledge-routes';
import { agentRoutes } from '@integration/apis/rest-api/routes/agent-routes';
import { quantumRoutes } from '@integration/apis/rest-api/routes/quantum-routes';
import { healthRoutes } from '@integration/apis/rest-api/routes/health-routes';

// Import GraphQL setup
import { createGraphQLServer } from '@integration/apis/graphql-api/graphql-server';

// Import WebSocket handlers
import { setupWebSocketHandlers } from '@integration/apis/websocket-api/websocket-handlers';

// Import utilities
import { Logger } from '@utils/helpers/logger';
import { ConfigManager } from '@config/config-manager';

const logger = Logger.getInstance();

export async function createApp(): Promise<Application> {
  const app: Application = express();
  const config = ConfigManager.getInstance();

  // Create HTTP server
  const httpServer = createServer(app);

  // Setup Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.get('CORS_ORIGIN', '*'),
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false
  }));

  // CORS configuration
  app.use(cors({
    origin: config.get('CORS_ORIGIN', '*'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Compression middleware
  app.use(compression());

  // Body parsing middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Request logging
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim())
    }
  }));

  // Custom request logger
  app.use(requestLogger);

  // Rate limiting
  app.use(rateLimiter);

  // Health check endpoint (before auth)
  app.use('/health', healthRoutes);

  // Authentication middleware (for protected routes)
  app.use('/api', authMiddleware);

  // Validation middleware
  app.use(validationMiddleware);

  // API Routes
  app.use('/api/agi', agiRoutes);
  app.use('/api/neural', neuralRoutes);
  app.use('/api/reasoning', reasoningRoutes);
  app.use('/api/code', codeIntelligenceRoutes);
  app.use('/api/knowledge', knowledgeRoutes);
  app.use('/api/agents', agentRoutes);
  app.use('/api/quantum', quantumRoutes);

  // GraphQL endpoint
  const graphqlServer = await createGraphQLServer();
  await graphqlServer.start();
  graphqlServer.applyMiddleware({ 
    app, 
    path: '/graphql',
    cors: false // Already handled above
  });

  // WebSocket handlers
  setupWebSocketHandlers(io);

  // Serve static files (for documentation, UI, etc.)
  app.use('/static', express.static('public'));
  app.use('/docs', express.static('docs'));

  // API documentation
  if (config.get('ENABLE_SWAGGER', true)) {
    const swaggerUi = require('swagger-ui-express');
    const swaggerDocument = require('../docs/api/swagger.json');
    
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Advanced AGI System API Documentation'
    }));
  }

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'Advanced AGI System',
      version: '1.0.0',
      description: 'Advanced Artificial General Intelligence System with Neural Networks, Quantum Computing, and Multi-Agent Intelligence',
      status: 'operational',
      capabilities: [
        'Neural Network Processing',
        'Quantum-Inspired Computing',
        'Multi-Agent Coordination',
        'Code Intelligence & Debugging',
        'Advanced Reasoning',
        'Knowledge Management',
        'Self-Awareness & Learning',
        'Safety & Security Monitoring'
      ],
      endpoints: {
        api: '/api',
        graphql: '/graphql',
        websocket: '/socket.io',
        docs: '/api-docs',
        health: '/health'
      },
      timestamp: new Date().toISOString()
    });
  });

  // 404 handler
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      error: 'Endpoint not found',
      message: `The requested endpoint ${req.originalUrl} does not exist`,
      availableEndpoints: [
        '/api/agi',
        '/api/neural',
        '/api/reasoning',
        '/api/code',
        '/api/knowledge',
        '/api/agents',
        '/api/quantum',
        '/graphql',
        '/health',
        '/api-docs'
      ]
    });
  });

  // Global error handler
  app.use(errorHandler);

  // Store the HTTP server and Socket.IO instance for access
  (app as any).httpServer = httpServer;
  (app as any).io = io;

  logger.info('✅ Express application configured successfully');
  
  return app;
}

export { createApp };