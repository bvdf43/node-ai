/**
 * Graceful Shutdown Utility
 * 
 * Handles graceful shutdown of the application with proper cleanup
 */

import { Server } from 'http';
import { Logger } from './logger';

const logger = Logger.getInstance();

export function gracefulShutdown(server: Server, cleanup: () => Promise<void>): void {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async (err) => {
      if (err) {
        logger.error('Error during server shutdown:', err);
        process.exit(1);
      }

      try {
        // Run cleanup tasks
        await cleanup();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during cleanup:', error);
        process.exit(1);
      }
    });

    // Force shutdown after timeout
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 30000); // 30 seconds timeout
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon
}