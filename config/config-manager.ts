/**
 * Configuration Manager
 * 
 * Centralized configuration management system with environment-specific
 * configurations, validation, and hot-reloading capabilities.
 */

import { readFileSync, existsSync, watchFile } from 'fs';
import { join } from 'path';
import { EventEmitter } from 'events';
import Joi from 'joi';

export interface ConfigSchema {
  // Server Configuration
  NODE_ENV: string;
  PORT: number;
  HOST: string;
  
  // API Keys
  NVIDIA_API_KEY: string;
  NVIDIA_BASE_URL: string;
  SAMBANOVA_API_KEY: string;
  SAMBANOVA_BASE_URL: string;
  CEREBRAS_API_KEY: string;
  CEREBRAS_BASE_URL: string;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  ANTHROPIC_API_KEY?: string;
  
  // Database Configuration
  MONGODB_URI: string;
  POSTGRES_URI: string;
  REDIS_URI: string;
  NEO4J_URI: string;
  NEO4J_USERNAME: string;
  NEO4J_PASSWORD: string;
  
  // Vector Databases
  WEAVIATE_URL: string;
  PINECONE_API_KEY?: string;
  PINECONE_ENVIRONMENT?: string;
  CHROMA_HOST: string;
  CHROMA_PORT: number;
  
  // Elasticsearch
  ELASTICSEARCH_NODE: string;
  ELASTICSEARCH_USERNAME?: string;
  ELASTICSEARCH_PASSWORD?: string;
  
  // Security
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  BCRYPT_ROUNDS: number;
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  
  // Logging
  LOG_LEVEL: string;
  LOG_FORMAT: string;
  
  // Training Configuration
  TRAINING_DATA_PATH: string;
  MODEL_CHECKPOINT_PATH: string;
  PRETRAINED_MODELS_PATH: string;
  
  // Quantum Simulation
  QUANTUM_SIMULATOR_BACKEND: string;
  MAX_QUBITS: number;
  
  // Multi-agent System
  MAX_AGENTS: number;
  AGENT_COMMUNICATION_TIMEOUT: number;
  
  // Performance Optimization
  ENABLE_GPU_ACCELERATION: boolean;
  MAX_PARALLEL_PROCESSES: number;
  CACHE_TTL: number;
  
  // Monitoring
  ENABLE_METRICS: boolean;
  METRICS_PORT: number;
  ENABLE_TRACING: boolean;
  JAEGER_ENDPOINT?: string;
  
  // Development
  DEBUG?: string;
  ENABLE_CORS: boolean;
  ENABLE_SWAGGER: boolean;
  
  // Consciousness Configuration
  CONSCIOUSNESS_BUFFER_SIZE: number;
}

export class ConfigManager extends EventEmitter {
  private static instance: ConfigManager;
  private config: Partial<ConfigSchema> = {};
  private schema: Joi.ObjectSchema;
  private configPath: string;
  private isInitialized: boolean = false;
  private watchers: Map<string, () => void> = new Map();

  private constructor() {
    super();
    this.configPath = join(process.cwd(), 'config');
    this.schema = this.createValidationSchema();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load environment-specific configuration
      await this.loadConfiguration();
      
      // Validate configuration
      await this.validateConfiguration();
      
      // Setup configuration watching
      this.setupConfigWatching();
      
      this.isInitialized = true;
      this.emit('initialized', this.config);
      
    } catch (error) {
      this.emit('error', error);
      throw new Error(`Failed to initialize configuration: ${error.message}`);
    }
  }

  private async loadConfiguration(): Promise<void> {
    const env = process.env.NODE_ENV || 'development';
    
    // Load base configuration
    await this.loadConfigFile('default');
    
    // Load environment-specific configuration
    await this.loadConfigFile(env);
    
    // Load local overrides (if exists)
    await this.loadConfigFile('local');
    
    // Override with environment variables
    this.loadEnvironmentVariables();
  }

  private async loadConfigFile(configName: string): Promise<void> {
    const configFiles = [
      join(this.configPath, `${configName}.json`),
      join(this.configPath, `${configName}.js`),
      join(this.configPath, `${configName}.ts`)
    ];

    for (const configFile of configFiles) {
      if (existsSync(configFile)) {
        try {
          let configData: any;
          
          if (configFile.endsWith('.json')) {
            const fileContent = readFileSync(configFile, 'utf8');
            configData = JSON.parse(fileContent);
          } else if (configFile.endsWith('.js') || configFile.endsWith('.ts')) {
            // Dynamic import for JS/TS files
            const module = await import(configFile);
            configData = module.default || module;
          }

          // Merge configuration
          this.config = { ...this.config, ...configData };
          
          // Setup file watching
          this.setupFileWatcher(configFile);
          
        } catch (error) {
          throw new Error(`Failed to load config file ${configFile}: ${error.message}`);
        }
        break;
      }
    }
  }

  private loadEnvironmentVariables(): void {
    // Map environment variables to configuration
    const envMappings: Record<string, keyof ConfigSchema> = {
      NODE_ENV: 'NODE_ENV',
      PORT: 'PORT',
      HOST: 'HOST',
      NVIDIA_API_KEY: 'NVIDIA_API_KEY',
      NVIDIA_BASE_URL: 'NVIDIA_BASE_URL',
      SAMBANOVA_API_KEY: 'SAMBANOVA_API_KEY',
      SAMBANOVA_BASE_URL: 'SAMBANOVA_BASE_URL',
      CEREBRAS_API_KEY: 'CEREBRAS_API_KEY',
      CEREBRAS_BASE_URL: 'CEREBRAS_BASE_URL',
      OPENAI_API_KEY: 'OPENAI_API_KEY',
      OPENAI_BASE_URL: 'OPENAI_BASE_URL',
      ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',
      MONGODB_URI: 'MONGODB_URI',
      POSTGRES_URI: 'POSTGRES_URI',
      REDIS_URI: 'REDIS_URI',
      NEO4J_URI: 'NEO4J_URI',
      NEO4J_USERNAME: 'NEO4J_USERNAME',
      NEO4J_PASSWORD: 'NEO4J_PASSWORD',
      WEAVIATE_URL: 'WEAVIATE_URL',
      PINECONE_API_KEY: 'PINECONE_API_KEY',
      PINECONE_ENVIRONMENT: 'PINECONE_ENVIRONMENT',
      CHROMA_HOST: 'CHROMA_HOST',
      CHROMA_PORT: 'CHROMA_PORT',
      ELASTICSEARCH_NODE: 'ELASTICSEARCH_NODE',
      ELASTICSEARCH_USERNAME: 'ELASTICSEARCH_USERNAME',
      ELASTICSEARCH_PASSWORD: 'ELASTICSEARCH_PASSWORD',
      JWT_SECRET: 'JWT_SECRET',
      JWT_EXPIRES_IN: 'JWT_EXPIRES_IN',
      BCRYPT_ROUNDS: 'BCRYPT_ROUNDS',
      RATE_LIMIT_WINDOW_MS: 'RATE_LIMIT_WINDOW_MS',
      RATE_LIMIT_MAX_REQUESTS: 'RATE_LIMIT_MAX_REQUESTS',
      LOG_LEVEL: 'LOG_LEVEL',
      LOG_FORMAT: 'LOG_FORMAT',
      TRAINING_DATA_PATH: 'TRAINING_DATA_PATH',
      MODEL_CHECKPOINT_PATH: 'MODEL_CHECKPOINT_PATH',
      PRETRAINED_MODELS_PATH: 'PRETRAINED_MODELS_PATH',
      QUANTUM_SIMULATOR_BACKEND: 'QUANTUM_SIMULATOR_BACKEND',
      MAX_QUBITS: 'MAX_QUBITS',
      MAX_AGENTS: 'MAX_AGENTS',
      AGENT_COMMUNICATION_TIMEOUT: 'AGENT_COMMUNICATION_TIMEOUT',
      ENABLE_GPU_ACCELERATION: 'ENABLE_GPU_ACCELERATION',
      MAX_PARALLEL_PROCESSES: 'MAX_PARALLEL_PROCESSES',
      CACHE_TTL: 'CACHE_TTL',
      ENABLE_METRICS: 'ENABLE_METRICS',
      METRICS_PORT: 'METRICS_PORT',
      ENABLE_TRACING: 'ENABLE_TRACING',
      JAEGER_ENDPOINT: 'JAEGER_ENDPOINT',
      DEBUG: 'DEBUG',
      ENABLE_CORS: 'ENABLE_CORS',
      ENABLE_SWAGGER: 'ENABLE_SWAGGER',
      CONSCIOUSNESS_BUFFER_SIZE: 'CONSCIOUSNESS_BUFFER_SIZE'
    };

    for (const [envVar, configKey] of Object.entries(envMappings)) {
      const envValue = process.env[envVar];
      if (envValue !== undefined) {
        this.config[configKey] = this.parseEnvironmentValue(envValue);
      }
    }
  }

  private parseEnvironmentValue(value: string): any {
    // Try to parse as number
    if (/^\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    
    // Try to parse as float
    if (/^\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }
    
    // Try to parse as boolean
    if (value.toLowerCase() === 'true') {
      return true;
    }
    if (value.toLowerCase() === 'false') {
      return false;
    }
    
    // Try to parse as JSON
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch {
        // Fall through to return as string
      }
    }
    
    return value;
  }

  private async validateConfiguration(): Promise<void> {
    const { error, value } = this.schema.validate(this.config, {
      allowUnknown: true,
      stripUnknown: false
    });

    if (error) {
      throw new Error(`Configuration validation failed: ${error.details.map(d => d.message).join(', ')}`);
    }

    this.config = value;
  }

  private createValidationSchema(): Joi.ObjectSchema {
    return Joi.object({
      // Server Configuration
      NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
      PORT: Joi.number().port().default(3000),
      HOST: Joi.string().default('0.0.0.0'),
      
      // API Keys
      NVIDIA_API_KEY: Joi.string().required(),
      NVIDIA_BASE_URL: Joi.string().uri().default('https://integrate.api.nvidia.com/v1'),
      SAMBANOVA_API_KEY: Joi.string().required(),
      SAMBANOVA_BASE_URL: Joi.string().uri().default('https://api.sambanova.ai/v1/chat/completions'),
      CEREBRAS_API_KEY: Joi.string().required(),
      CEREBRAS_BASE_URL: Joi.string().uri().default('https://api.cerebras.ai/v1/chat/completions'),
      OPENAI_API_KEY: Joi.string().optional(),
      OPENAI_BASE_URL: Joi.string().uri().default('https://api.openai.com/v1'),
      ANTHROPIC_API_KEY: Joi.string().optional(),
      
      // Database Configuration
      MONGODB_URI: Joi.string().default('mongodb://localhost:27017/advanced-agi-system'),
      POSTGRES_URI: Joi.string().default('postgresql://localhost:5432/advanced_agi_system'),
      REDIS_URI: Joi.string().default('redis://localhost:6379'),
      NEO4J_URI: Joi.string().default('bolt://localhost:7687'),
      NEO4J_USERNAME: Joi.string().default('neo4j'),
      NEO4J_PASSWORD: Joi.string().default('password'),
      
      // Vector Databases
      WEAVIATE_URL: Joi.string().uri().default('http://localhost:8080'),
      PINECONE_API_KEY: Joi.string().optional(),
      PINECONE_ENVIRONMENT: Joi.string().optional(),
      CHROMA_HOST: Joi.string().default('localhost'),
      CHROMA_PORT: Joi.number().port().default(8000),
      
      // Elasticsearch
      ELASTICSEARCH_NODE: Joi.string().uri().default('http://localhost:9200'),
      ELASTICSEARCH_USERNAME: Joi.string().optional(),
      ELASTICSEARCH_PASSWORD: Joi.string().optional(),
      
      // Security
      JWT_SECRET: Joi.string().min(32).required(),
      JWT_EXPIRES_IN: Joi.string().default('24h'),
      BCRYPT_ROUNDS: Joi.number().min(10).max(15).default(12),
      
      // Rate Limiting
      RATE_LIMIT_WINDOW_MS: Joi.number().positive().default(900000), // 15 minutes
      RATE_LIMIT_MAX_REQUESTS: Joi.number().positive().default(100),
      
      // Logging
      LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
      LOG_FORMAT: Joi.string().valid('json', 'simple').default('json'),
      
      // Training Configuration
      TRAINING_DATA_PATH: Joi.string().default('./data/training'),
      MODEL_CHECKPOINT_PATH: Joi.string().default('./models/checkpoints'),
      PRETRAINED_MODELS_PATH: Joi.string().default('./models/pretrained'),
      
      // Quantum Simulation
      QUANTUM_SIMULATOR_BACKEND: Joi.string().valid('qiskit', 'cirq', 'custom').default('qiskit'),
      MAX_QUBITS: Joi.number().positive().max(64).default(32),
      
      // Multi-agent System
      MAX_AGENTS: Joi.number().positive().max(100).default(10),
      AGENT_COMMUNICATION_TIMEOUT: Joi.number().positive().default(30000),
      
      // Performance Optimization
      ENABLE_GPU_ACCELERATION: Joi.boolean().default(true),
      MAX_PARALLEL_PROCESSES: Joi.number().positive().default(4),
      CACHE_TTL: Joi.number().positive().default(3600),
      
      // Monitoring
      ENABLE_METRICS: Joi.boolean().default(true),
      METRICS_PORT: Joi.number().port().default(9090),
      ENABLE_TRACING: Joi.boolean().default(true),
      JAEGER_ENDPOINT: Joi.string().uri().optional(),
      
      // Development
      DEBUG: Joi.string().optional(),
      ENABLE_CORS: Joi.boolean().default(true),
      ENABLE_SWAGGER: Joi.boolean().default(true),
      
      // Consciousness Configuration
      CONSCIOUSNESS_BUFFER_SIZE: Joi.number().positive().default(1000)
    });
  }

  private setupFileWatcher(filePath: string): void {
    if (this.watchers.has(filePath)) {
      return;
    }

    const watcher = () => {
      this.emit('configChanged', filePath);
      // Reload configuration after a short delay to avoid multiple rapid changes
      setTimeout(() => this.reloadConfiguration(), 1000);
    };

    watchFile(filePath, { interval: 1000 }, watcher);
    this.watchers.set(filePath, watcher);
  }

  private setupConfigWatching(): void {
    this.on('configChanged', (filePath: string) => {
      console.log(`Configuration file changed: ${filePath}`);
    });
  }

  private async reloadConfiguration(): Promise<void> {
    try {
      const oldConfig = { ...this.config };
      await this.loadConfiguration();
      await this.validateConfiguration();
      
      this.emit('configReloaded', {
        oldConfig,
        newConfig: this.config
      });
      
    } catch (error) {
      this.emit('configReloadError', error);
    }
  }

  // Public methods
  public get<K extends keyof ConfigSchema>(key: K): ConfigSchema[K];
  public get<K extends keyof ConfigSchema>(key: K, defaultValue: ConfigSchema[K]): ConfigSchema[K];
  public get<K extends keyof ConfigSchema>(key: K, defaultValue?: ConfigSchema[K]): ConfigSchema[K] | undefined {
    const value = this.config[key];
    return value !== undefined ? value : defaultValue;
  }

  public set<K extends keyof ConfigSchema>(key: K, value: ConfigSchema[K]): void {
    const oldValue = this.config[key];
    this.config[key] = value;
    
    this.emit('configValueChanged', {
      key,
      oldValue,
      newValue: value
    });
  }

  public has<K extends keyof ConfigSchema>(key: K): boolean {
    return this.config[key] !== undefined;
  }

  public getAll(): Partial<ConfigSchema> {
    return { ...this.config };
  }

  public getSecure(): Partial<ConfigSchema> {
    const secureConfig = { ...this.config };
    
    // Remove sensitive information
    const sensitiveKeys = [
      'NVIDIA_API_KEY', 'SAMBANOVA_API_KEY', 'CEREBRAS_API_KEY',
      'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'PINECONE_API_KEY',
      'JWT_SECRET', 'NEO4J_PASSWORD', 'ELASTICSEARCH_PASSWORD'
    ];
    
    sensitiveKeys.forEach(key => {
      if (secureConfig[key as keyof ConfigSchema]) {
        (secureConfig as any)[key] = '[REDACTED]';
      }
    });
    
    return secureConfig;
  }

  public validate(): { isValid: boolean; errors?: string[] } {
    const { error } = this.schema.validate(this.config);
    
    if (error) {
      return {
        isValid: false,
        errors: error.details.map(d => d.message)
      };
    }
    
    return { isValid: true };
  }

  public async reload(): Promise<void> {
    await this.reloadConfiguration();
  }

  public destroy(): void {
    // Stop watching files
    this.watchers.forEach((watcher, filePath) => {
      // Note: Node.js doesn't provide a direct way to stop watchFile
      // In a real implementation, you might want to use fs.watch instead
    });
    
    this.watchers.clear();
    this.removeAllListeners();
    this.isInitialized = false;
  }

  // Environment-specific getters
  public isDevelopment(): boolean {
    return this.get('NODE_ENV') === 'development';
  }

  public isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  public isTest(): boolean {
    return this.get('NODE_ENV') === 'test';
  }

  // Feature flags
  public isFeatureEnabled(feature: string): boolean {
    const featureKey = `ENABLE_${feature.toUpperCase()}` as keyof ConfigSchema;
    return this.get(featureKey as any, false) as boolean;
  }

  // Database connection strings
  public getDatabaseConfig(database: 'mongodb' | 'postgres' | 'redis' | 'neo4j' | 'elasticsearch'): any {
    switch (database) {
      case 'mongodb':
        return { uri: this.get('MONGODB_URI') };
      
      case 'postgres':
        return { uri: this.get('POSTGRES_URI') };
      
      case 'redis':
        return { uri: this.get('REDIS_URI') };
      
      case 'neo4j':
        return {
          uri: this.get('NEO4J_URI'),
          username: this.get('NEO4J_USERNAME'),
          password: this.get('NEO4J_PASSWORD')
        };
      
      case 'elasticsearch':
        return {
          node: this.get('ELASTICSEARCH_NODE'),
          username: this.get('ELASTICSEARCH_USERNAME'),
          password: this.get('ELASTICSEARCH_PASSWORD')
        };
      
      default:
        throw new Error(`Unknown database: ${database}`);
    }
  }

  // LLM provider configurations
  public getLLMConfig(provider: 'nvidia' | 'sambanova' | 'cerebras' | 'openai' | 'anthropic'): any {
    switch (provider) {
      case 'nvidia':
        return {
          apiKey: this.get('NVIDIA_API_KEY'),
          baseURL: this.get('NVIDIA_BASE_URL')
        };
      
      case 'sambanova':
        return {
          apiKey: this.get('SAMBANOVA_API_KEY'),
          baseURL: this.get('SAMBANOVA_BASE_URL')
        };
      
      case 'cerebras':
        return {
          apiKey: this.get('CEREBRAS_API_KEY'),
          baseURL: this.get('CEREBRAS_BASE_URL')
        };
      
      case 'openai':
        return {
          apiKey: this.get('OPENAI_API_KEY'),
          baseURL: this.get('OPENAI_BASE_URL')
        };
      
      case 'anthropic':
        return {
          apiKey: this.get('ANTHROPIC_API_KEY')
        };
      
      default:
        throw new Error(`Unknown LLM provider: ${provider}`);
    }
  }
}