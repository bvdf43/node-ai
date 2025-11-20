/**
 * Advanced Logger Utility
 * 
 * Comprehensive logging system with multiple transports, structured logging,
 * and integration with monitoring systems.
 */

import winston from 'winston';
import path from 'path';
import { ConfigManager } from '@config/config-manager';

export class Logger {
  private static instance: Logger;
  private winston: winston.Logger;
  private config: ConfigManager;

  private constructor() {
    this.config = ConfigManager.getInstance();
    this.winston = this.createWinstonLogger();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private createWinstonLogger(): winston.Logger {
    const logLevel = this.config.get('LOG_LEVEL', 'info');
    const logFormat = this.config.get('LOG_FORMAT', 'json');
    const nodeEnv = this.config.get('NODE_ENV', 'development');

    // Custom format for structured logging
    const customFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
      }),
      winston.format.errors({ stack: true }),
      winston.format.metadata({
        fillExcept: ['message', 'level', 'timestamp', 'label']
      })
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, metadata, stack }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        
        if (metadata && Object.keys(metadata).length > 0) {
          log += `\n  Metadata: ${JSON.stringify(metadata, null, 2)}`;
        }
        
        if (stack) {
          log += `\n  Stack: ${stack}`;
        }
        
        return log;
      })
    );

    // JSON format for production
    const jsonFormat = winston.format.combine(
      customFormat,
      winston.format.json()
    );

    const transports: winston.transport[] = [];

    // Console transport
    if (nodeEnv === 'development') {
      transports.push(
        new winston.transports.Console({
          level: logLevel,
          format: consoleFormat
        })
      );
    } else {
      transports.push(
        new winston.transports.Console({
          level: logLevel,
          format: jsonFormat
        })
      );
    }

    // File transports
    const logsDir = path.join(process.cwd(), 'logs');
    
    // General log file
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'application.log'),
        level: logLevel,
        format: jsonFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
      })
    );

    // Error log file
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        format: jsonFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
      })
    );

    // AGI-specific log file
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'agi-system.log'),
        level: 'debug',
        format: jsonFormat,
        maxsize: 50 * 1024 * 1024, // 50MB
        maxFiles: 10,
        tailable: true
      })
    );

    return winston.createLogger({
      level: logLevel,
      format: customFormat,
      transports,
      exitOnError: false,
      silent: process.env.NODE_ENV === 'test'
    });
  }

  // Standard logging methods
  public debug(message: string, metadata?: any): void {
    this.winston.debug(message, metadata);
  }

  public info(message: string, metadata?: any): void {
    this.winston.info(message, metadata);
  }

  public warn(message: string, metadata?: any): void {
    this.winston.warn(message, metadata);
  }

  public error(message: string, error?: Error | any, metadata?: any): void {
    if (error instanceof Error) {
      this.winston.error(message, {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        ...metadata
      });
    } else if (error) {
      this.winston.error(message, { error, ...metadata });
    } else {
      this.winston.error(message, metadata);
    }
  }

  // AGI-specific logging methods
  public agi(level: string, component: string, message: string, metadata?: any): void {
    this.winston.log(level, `[AGI:${component}] ${message}`, {
      component,
      category: 'agi',
      ...metadata
    });
  }

  public neural(message: string, metadata?: any): void {
    this.agi('info', 'NEURAL', message, metadata);
  }

  public reasoning(message: string, metadata?: any): void {
    this.agi('info', 'REASONING', message, metadata);
  }

  public consciousness(message: string, metadata?: any): void {
    this.agi('info', 'CONSCIOUSNESS', message, metadata);
  }

  public quantum(message: string, metadata?: any): void {
    this.agi('info', 'QUANTUM', message, metadata);
  }

  public agent(agentId: string, message: string, metadata?: any): void {
    this.agi('info', 'AGENT', message, { agentId, ...metadata });
  }

  public knowledge(message: string, metadata?: any): void {
    this.agi('info', 'KNOWLEDGE', message, metadata);
  }

  public security(message: string, metadata?: any): void {
    this.winston.warn(`[SECURITY] ${message}`, {
      category: 'security',
      ...metadata
    });
  }

  public performance(message: string, metrics?: any): void {
    this.winston.info(`[PERFORMANCE] ${message}`, {
      category: 'performance',
      metrics,
      timestamp: new Date().toISOString()
    });
  }

  public audit(action: string, userId?: string, metadata?: any): void {
    this.winston.info(`[AUDIT] ${action}`, {
      category: 'audit',
      userId,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  // Request logging
  public request(method: string, url: string, statusCode: number, responseTime: number, metadata?: any): void {
    const level = statusCode >= 400 ? 'warn' : 'info';
    this.winston.log(level, `${method} ${url} ${statusCode} - ${responseTime}ms`, {
      category: 'request',
      method,
      url,
      statusCode,
      responseTime,
      ...metadata
    });
  }

  // Database logging
  public database(operation: string, collection: string, duration: number, metadata?: any): void {
    this.winston.debug(`[DB] ${operation} on ${collection} - ${duration}ms`, {
      category: 'database',
      operation,
      collection,
      duration,
      ...metadata
    });
  }

  // Model training logging
  public training(modelId: string, epoch: number, loss: number, accuracy: number, metadata?: any): void {
    this.winston.info(`[TRAINING] Model ${modelId} - Epoch ${epoch}: Loss=${loss.toFixed(4)}, Accuracy=${accuracy.toFixed(4)}`, {
      category: 'training',
      modelId,
      epoch,
      loss,
      accuracy,
      ...metadata
    });
  }

  // Inference logging
  public inference(modelId: string, inputType: string, confidence: number, processingTime: number, metadata?: any): void {
    this.winston.debug(`[INFERENCE] Model ${modelId} - ${inputType}: Confidence=${confidence.toFixed(3)}, Time=${processingTime}ms`, {
      category: 'inference',
      modelId,
      inputType,
      confidence,
      processingTime,
      ...metadata
    });
  }

  // System health logging
  public health(component: string, status: string, metrics?: any): void {
    const level = status === 'healthy' ? 'debug' : status === 'degraded' ? 'warn' : 'error';
    this.winston.log(level, `[HEALTH] ${component}: ${status}`, {
      category: 'health',
      component,
      status,
      metrics,
      timestamp: new Date().toISOString()
    });
  }

  // Memory and resource logging
  public resource(type: string, usage: number, limit: number, metadata?: any): void {
    const percentage = (usage / limit) * 100;
    const level = percentage > 90 ? 'error' : percentage > 75 ? 'warn' : 'debug';
    
    this.winston.log(level, `[RESOURCE] ${type}: ${usage}/${limit} (${percentage.toFixed(1)}%)`, {
      category: 'resource',
      type,
      usage,
      limit,
      percentage,
      ...metadata
    });
  }

  // Structured event logging
  public event(eventType: string, eventData: any, metadata?: any): void {
    this.winston.info(`[EVENT] ${eventType}`, {
      category: 'event',
      eventType,
      eventData,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  // Metric logging for monitoring systems
  public metric(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
    this.winston.debug(`[METRIC] ${name}: ${value}${unit || ''}`, {
      category: 'metric',
      metricName: name,
      metricValue: value,
      metricUnit: unit,
      metricTags: tags,
      timestamp: new Date().toISOString()
    });
  }

  // Trace logging for debugging
  public trace(traceId: string, spanId: string, operation: string, duration: number, metadata?: any): void {
    this.winston.debug(`[TRACE] ${operation} - ${duration}ms`, {
      category: 'trace',
      traceId,
      spanId,
      operation,
      duration,
      ...metadata
    });
  }

  // Configuration change logging
  public configChange(key: string, oldValue: any, newValue: any, changedBy?: string): void {
    this.winston.warn(`[CONFIG] ${key} changed from ${JSON.stringify(oldValue)} to ${JSON.stringify(newValue)}`, {
      category: 'config',
      configKey: key,
      oldValue,
      newValue,
      changedBy,
      timestamp: new Date().toISOString()
    });
  }

  // Create child logger with additional context
  public child(context: Record<string, any>): winston.Logger {
    return this.winston.child(context);
  }

  // Flush logs (useful for testing)
  public async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.winston.on('finish', resolve);
      this.winston.end();
    });
  }

  // Get current log level
  public getLevel(): string {
    return this.winston.level;
  }

  // Set log level dynamically
  public setLevel(level: string): void {
    this.winston.level = level;
    this.winston.transports.forEach(transport => {
      transport.level = level;
    });
  }

  // Check if level is enabled
  public isLevelEnabled(level: string): boolean {
    return this.winston.isLevelEnabled(level);
  }

  // Profile performance
  public profile(id: string): void {
    this.winston.profile(id);
  }

  // Start timer
  public startTimer(): winston.Profiler {
    return this.winston.startTimer();
  }

  // Query logs (useful for debugging)
  public async queryLogs(options: winston.QueryOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      this.winston.query(options, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  }
}