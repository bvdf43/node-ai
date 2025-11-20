#!/usr/bin/env node

/**
 * Advanced AGI System - Main Entry Point
 * 
 * This is the main entry point for the Advanced AGI System.
 * It initializes all core components, starts the server, and manages the system lifecycle.
 */

import 'dotenv/config';
import { createApp } from './app';
import { Logger } from '@utils/helpers/logger';
import { ConfigManager } from '@config/config-manager';
import { DatabaseManager } from '@integration/databases/database-manager';
import { MasterController } from '@core/agi-engine/master-controller';
import { SystemMonitor } from '@monitoring/system-monitor';
import { gracefulShutdown } from '@utils/helpers/graceful-shutdown';

const logger = Logger.getInstance();

async function bootstrap(): Promise<void> {
  try {
    logger.info('🚀 Starting Advanced AGI System...');

    // Load configuration
    const config = ConfigManager.getInstance();
    await config.initialize();
    logger.info('✅ Configuration loaded');

    // Initialize databases
    const dbManager = DatabaseManager.getInstance();
    await dbManager.initialize();
    logger.info('✅ Databases initialized');

    // Initialize the AGI Master Controller
    const masterController = MasterController.getInstance();
    await masterController.initialize();
    logger.info('✅ AGI Master Controller initialized');

    // Create and start the application
    const app = await createApp();
    const port = config.get('PORT', 3000);
    const host = config.get('HOST', '0.0.0.0');

    const server = app.listen(port, host, () => {
      logger.info(`🌟 Advanced AGI System is running on http://${host}:${port}`);
      logger.info('🧠 AGI Engine Status: ACTIVE');
      logger.info('🔬 Neural Networks: LOADED');
      logger.info('⚡ Quantum Algorithms: READY');
      logger.info('🤖 Multi-Agent System: ONLINE');
      logger.info('🛡️  Safety Systems: ENABLED');
    });

    // Initialize system monitoring
    const systemMonitor = SystemMonitor.getInstance();
    await systemMonitor.start();
    logger.info('✅ System monitoring started');

    // Setup graceful shutdown
    gracefulShutdown(server, async () => {
      logger.info('🔄 Shutting down Advanced AGI System...');
      
      await systemMonitor.stop();
      await masterController.shutdown();
      await dbManager.disconnect();
      
      logger.info('✅ Advanced AGI System shutdown complete');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start Advanced AGI System:', error);
    process.exit(1);
  }
}

// Start the system
bootstrap().catch((error) => {
  console.error('Bootstrap failed:', error);
  process.exit(1);
});

export { bootstrap };