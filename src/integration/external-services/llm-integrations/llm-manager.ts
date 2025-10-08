/**
 * LLM Manager - Unified Interface for All LLM Providers
 * 
 * This manager provides a unified interface to interact with multiple LLM providers
 * including NVIDIA, SambaNova, and Cerebras, with intelligent routing and fallback.
 */

import { EventEmitter } from 'events';
import { Logger } from '@utils/helpers/logger';
import { ConfigManager } from '@config/config-manager';
import { NVIDIAConnector } from './nvidia-connector';
import { SambaNovaConnector } from './sambanova-connector';
import { CerebrasConnector } from './cerebras-connector';

export interface LLMProvider {
  name: string;
  connector: NVIDIAConnector | SambaNovaConnector | CerebrasConnector;
  isAvailable: boolean;
  priority: number;
  capabilities: string[];
  models: string[];
}

export interface LLMRequest {
  prompt: string;
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  model?: string;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  fallbackEnabled?: boolean;
  capabilities?: string[];
}

export interface LLMResponse {
  content: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  processingTime: number;
  confidence?: number;
}

export interface ProviderStats {
  name: string;
  requestCount: number;
  errorCount: number;
  errorRate: number;
  averageResponseTime: number;
  isHealthy: boolean;
  lastHealthCheck: Date;
}

export class LLMManager extends EventEmitter {
  private logger: Logger;
  private config: ConfigManager;
  private providers: Map<string, LLMProvider> = new Map();
  private requestHistory: Array<{ provider: string; model: string; success: boolean; responseTime: number; timestamp: Date }> = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.logger = Logger.getInstance();
    this.config = ConfigManager.getInstance();
  }

  public async initialize(): Promise<void> {
    try {
      this.logger.info('🤖 Initializing LLM Manager...');

      // Initialize providers
      await this.initializeProviders();

      // Test connections
      await this.testAllConnections();

      // Start health monitoring
      this.startHealthMonitoring();

      this.logger.info('✅ LLM Manager initialized successfully');
      this.emit('initialized', {
        providers: Array.from(this.providers.keys()),
        totalModels: this.getTotalModelCount()
      });

    } catch (error) {
      this.logger.error('Failed to initialize LLM Manager:', error);
      throw error;
    }
  }

  private async initializeProviders(): Promise<void> {
    // Initialize NVIDIA provider
    try {
      const nvidiaConnector = new NVIDIAConnector();
      this.providers.set('nvidia', {
        name: 'NVIDIA',
        connector: nvidiaConnector,
        isAvailable: true,
        priority: 1,
        capabilities: ['general', 'reasoning', 'code', 'creative'],
        models: nvidiaConnector.getAvailableModels()
      });
      this.logger.info('✅ NVIDIA provider initialized');
    } catch (error) {
      this.logger.warn('Failed to initialize NVIDIA provider:', error.message);
    }

    // Initialize SambaNova provider
    try {
      const sambaNovaConnector = new SambaNovaConnector();
      this.providers.set('sambanova', {
        name: 'SambaNova',
        connector: sambaNovaConnector,
        isAvailable: true,
        priority: 2,
        capabilities: ['reasoning', 'mathematics', 'analysis', 'research'],
        models: sambaNovaConnector.getAvailableModels()
      });
      this.logger.info('✅ SambaNova provider initialized');
    } catch (error) {
      this.logger.warn('Failed to initialize SambaNova provider:', error.message);
    }

    // Initialize Cerebras provider
    try {
      const cerebrasConnector = new CerebrasConnector();
      this.providers.set('cerebras', {
        name: 'Cerebras',
        connector: cerebrasConnector,
        isAvailable: true,
        priority: 3,
        capabilities: ['code', 'reasoning', 'analysis', 'optimization'],
        models: cerebrasConnector.getAvailableModels()
      });
      this.logger.info('✅ Cerebras provider initialized');
    } catch (error) {
      this.logger.warn('Failed to initialize Cerebras provider:', error.message);
    }

    this.logger.info(`Initialized ${this.providers.size} LLM providers`);
  }

  private async testAllConnections(): Promise<void> {
    const testPromises = Array.from(this.providers.entries()).map(async ([name, provider]) => {
      try {
        const isHealthy = await provider.connector.testConnection();
        provider.isAvailable = isHealthy;
        
        if (isHealthy) {
          this.logger.info(`✅ ${name} provider connection test passed`);
        } else {
          this.logger.warn(`❌ ${name} provider connection test failed`);
        }
      } catch (error) {
        this.logger.error(`Error testing ${name} provider:`, error.message);
        provider.isAvailable = false;
      }
    });

    await Promise.all(testPromises);
  }

  public async generateCompletion(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    
    try {
      // Determine the best provider and model
      const { provider, model } = await this.selectProviderAndModel(request);
      
      this.logger.debug('Generating completion', {
        provider: provider.name,
        model,
        hasMessages: !!request.messages,
        promptLength: request.prompt?.length || 0
      });

      // Prepare messages
      const messages = request.messages || [
        { role: 'user' as const, content: request.prompt }
      ];

      // Generate completion
      let response;
      if (provider.name === 'NVIDIA') {
        response = await (provider.connector as NVIDIAConnector).generateCompletion(
          model,
          messages,
          {
            temperature: request.temperature,
            max_tokens: request.maxTokens
          }
        );
      } else if (provider.name === 'SambaNova') {
        response = await (provider.connector as SambaNovaConnector).generateCompletion(
          model,
          messages,
          {
            temperature: request.temperature,
            max_tokens: request.maxTokens
          }
        );
      } else if (provider.name === 'Cerebras') {
        response = await (provider.connector as CerebrasConnector).generateCompletion(
          model,
          messages,
          {
            temperature: request.temperature,
            max_tokens: request.maxTokens
          }
        );
      } else {
        throw new Error(`Unsupported provider: ${provider.name}`);
      }

      const processingTime = Date.now() - startTime;

      // Record success
      this.recordRequest(provider.name, model, true, processingTime);

      const llmResponse: LLMResponse = {
        content: response.choices[0]?.message?.content || '',
        provider: provider.name,
        model,
        usage: response.usage,
        processingTime,
        confidence: this.calculateConfidence(response, provider.name)
      };

      this.emit('completionGenerated', llmResponse);
      return llmResponse;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.logger.error('Error generating completion:', error);

      // Try fallback if enabled
      if (request.fallbackEnabled !== false) {
        try {
          return await this.tryFallback(request, error);
        } catch (fallbackError) {
          this.logger.error('Fallback also failed:', fallbackError);
        }
      }

      // Record failure
      if (request.provider) {
        this.recordRequest(request.provider, request.model || 'unknown', false, processingTime);
      }

      this.emit('completionError', { request, error: error.message });
      throw error;
    }
  }

  public async generateStreamCompletion(request: LLMRequest): Promise<AsyncGenerator<any, void, unknown>> {
    const { provider, model } = await this.selectProviderAndModel(request);
    
    this.logger.debug('Starting stream completion', {
      provider: provider.name,
      model
    });

    const messages = request.messages || [
      { role: 'user' as const, content: request.prompt }
    ];

    if (provider.name === 'NVIDIA') {
      return (provider.connector as NVIDIAConnector).generateStreamCompletion(
        model,
        messages,
        {
          temperature: request.temperature,
          max_tokens: request.maxTokens
        }
      );
    } else if (provider.name === 'SambaNova') {
      return (provider.connector as SambaNovaConnector).generateStreamCompletion(
        model,
        messages,
        {
          temperature: request.temperature,
          max_tokens: request.maxTokens
        }
      );
    } else if (provider.name === 'Cerebras') {
      return (provider.connector as CerebrasConnector).generateStreamCompletion(
        model,
        messages,
        {
          temperature: request.temperature,
          max_tokens: request.maxTokens
        }
      );
    } else {
      throw new Error(`Stream completion not supported for provider: ${provider.name}`);
    }
  }

  private async selectProviderAndModel(request: LLMRequest): Promise<{ provider: LLMProvider; model: string }> {
    // If specific provider is requested
    if (request.provider) {
      const provider = this.providers.get(request.provider.toLowerCase());
      if (!provider) {
        throw new Error(`Provider ${request.provider} not found`);
      }
      if (!provider.isAvailable) {
        throw new Error(`Provider ${request.provider} is not available`);
      }

      const model = request.model || this.selectBestModel(provider, request.capabilities);
      return { provider, model };
    }

    // If specific model is requested, find the provider
    if (request.model) {
      for (const [_, provider] of this.providers) {
        if (provider.isAvailable && provider.models.includes(request.model)) {
          return { provider, model: request.model };
        }
      }
      throw new Error(`Model ${request.model} not found in any available provider`);
    }

    // Select best provider based on capabilities and availability
    const availableProviders = Array.from(this.providers.values())
      .filter(p => p.isAvailable)
      .sort((a, b) => {
        // Score based on capability match and priority
        const aScore = this.calculateProviderScore(a, request.capabilities);
        const bScore = this.calculateProviderScore(b, request.capabilities);
        
        if (aScore !== bScore) {
          return bScore - aScore; // Higher score first
        }
        
        return a.priority - b.priority; // Lower priority number = higher priority
      });

    if (availableProviders.length === 0) {
      throw new Error('No available LLM providers');
    }

    const selectedProvider = availableProviders[0];
    const selectedModel = this.selectBestModel(selectedProvider, request.capabilities);

    return { provider: selectedProvider, model: selectedModel };
  }

  private calculateProviderScore(provider: LLMProvider, requestedCapabilities?: string[]): number {
    if (!requestedCapabilities || requestedCapabilities.length === 0) {
      return 1; // Base score
    }

    const matchingCapabilities = requestedCapabilities.filter(cap => 
      provider.capabilities.includes(cap)
    );

    return matchingCapabilities.length / requestedCapabilities.length;
  }

  private selectBestModel(provider: LLMProvider, requestedCapabilities?: string[]): string {
    if (provider.models.length === 0) {
      throw new Error(`No models available for provider ${provider.name}`);
    }

    // Model selection logic based on capabilities
    if (requestedCapabilities?.includes('code')) {
      // Prefer code-specific models
      const codeModels = provider.models.filter(model => 
        model.toLowerCase().includes('code') || 
        model.toLowerCase().includes('coder')
      );
      if (codeModels.length > 0) {
        return codeModels[0];
      }
    }

    if (requestedCapabilities?.includes('reasoning')) {
      // Prefer reasoning models
      const reasoningModels = provider.models.filter(model => 
        model.toLowerCase().includes('thinking') || 
        model.toLowerCase().includes('reasoning') ||
        model.toLowerCase().includes('instruct')
      );
      if (reasoningModels.length > 0) {
        return reasoningModels[0];
      }
    }

    if (requestedCapabilities?.includes('mathematics')) {
      // Prefer math-capable models
      const mathModels = provider.models.filter(model => 
        model.toLowerCase().includes('deepseek') ||
        model.toLowerCase().includes('qwen')
      );
      if (mathModels.length > 0) {
        return mathModels[0];
      }
    }

    // Default to first available model
    return provider.models[0];
  }

  private async tryFallback(originalRequest: LLMRequest, originalError: Error): Promise<LLMResponse> {
    this.logger.info('Attempting fallback for failed request');

    // Get available providers excluding the failed one
    const availableProviders = Array.from(this.providers.values())
      .filter(p => p.isAvailable && p.name !== originalRequest.provider)
      .sort((a, b) => a.priority - b.priority);

    if (availableProviders.length === 0) {
      throw new Error('No fallback providers available');
    }

    // Try each provider in order
    for (const provider of availableProviders) {
      try {
        const fallbackRequest = {
          ...originalRequest,
          provider: provider.name.toLowerCase(),
          model: undefined // Let it select the best model
        };

        this.logger.info(`Trying fallback with provider: ${provider.name}`);
        const response = await this.generateCompletion(fallbackRequest);
        
        this.logger.info(`Fallback successful with provider: ${provider.name}`);
        this.emit('fallbackSuccess', { 
          originalProvider: originalRequest.provider,
          fallbackProvider: provider.name,
          originalError: originalError.message
        });
        
        return response;
      } catch (fallbackError) {
        this.logger.warn(`Fallback failed with provider ${provider.name}:`, fallbackError.message);
        continue;
      }
    }

    throw new Error('All fallback attempts failed');
  }

  private calculateConfidence(response: any, providerName: string): number {
    let confidence = 0.8; // Base confidence

    // Adjust based on response quality indicators
    if (response.choices && response.choices.length > 0) {
      const choice = response.choices[0];
      
      // Higher confidence for complete responses
      if (choice.finish_reason === 'stop') {
        confidence += 0.1;
      } else if (choice.finish_reason === 'length') {
        confidence -= 0.1;
      }

      // Adjust based on content length (very short responses might be incomplete)
      const contentLength = choice.message?.content?.length || 0;
      if (contentLength < 10) {
        confidence -= 0.2;
      } else if (contentLength > 100) {
        confidence += 0.1;
      }
    }

    // Provider-specific adjustments
    const providerMultipliers: Record<string, number> = {
      'NVIDIA': 1.0,
      'SambaNova': 1.05, // Slightly higher for advanced reasoning
      'Cerebras': 1.02
    };

    confidence *= providerMultipliers[providerName] || 1.0;

    return Math.min(1.0, Math.max(0.0, confidence));
  }

  private recordRequest(provider: string, model: string, success: boolean, responseTime: number): void {
    this.requestHistory.push({
      provider,
      model,
      success,
      responseTime,
      timestamp: new Date()
    });

    // Keep only recent history
    const maxHistorySize = 1000;
    if (this.requestHistory.length > maxHistorySize) {
      this.requestHistory = this.requestHistory.slice(-maxHistorySize);
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 60000); // Check every minute

    this.logger.info('Health monitoring started');
  }

  private async performHealthChecks(): Promise<void> {
    const healthPromises = Array.from(this.providers.entries()).map(async ([name, provider]) => {
      try {
        const isHealthy = await provider.connector.testConnection();
        const wasAvailable = provider.isAvailable;
        provider.isAvailable = isHealthy;

        if (wasAvailable !== isHealthy) {
          this.logger.info(`Provider ${name} health status changed: ${wasAvailable} -> ${isHealthy}`);
          this.emit('providerHealthChanged', { provider: name, isHealthy });
        }
      } catch (error) {
        this.logger.warn(`Health check failed for provider ${name}:`, error.message);
        provider.isAvailable = false;
      }
    });

    await Promise.all(healthPromises);
  }

  // Specialized methods for different use cases
  public async generateCode(
    specification: string,
    language: string = 'python',
    complexity: 'simple' | 'moderate' | 'complex' = 'moderate'
  ): Promise<LLMResponse> {
    // Prefer Cerebras for code generation
    const request: LLMRequest = {
      prompt: `Generate ${language} code for: ${specification}`,
      provider: 'cerebras',
      capabilities: ['code'],
      temperature: 0.2,
      maxTokens: 4096
    };

    return this.generateCompletion(request);
  }

  public async solveReasoning(
    problem: string,
    domain?: string
  ): Promise<LLMResponse> {
    // Prefer SambaNova for advanced reasoning
    const request: LLMRequest = {
      prompt: `Solve this reasoning problem step by step: ${problem}${domain ? ` (Domain: ${domain})` : ''}`,
      provider: 'sambanova',
      capabilities: ['reasoning'],
      temperature: 0.3,
      maxTokens: 6144
    };

    return this.generateCompletion(request);
  }

  public async generateCreativeContent(
    prompt: string,
    creativity: number = 0.8
  ): Promise<LLMResponse> {
    const request: LLMRequest = {
      prompt,
      capabilities: ['creative'],
      temperature: creativity,
      maxTokens: 4096
    };

    return this.generateCompletion(request);
  }

  public async analyzeData(
    data: string,
    analysisType: string = 'comprehensive'
  ): Promise<LLMResponse> {
    const request: LLMRequest = {
      prompt: `Analyze this data (${analysisType} analysis): ${data}`,
      capabilities: ['analysis'],
      temperature: 0.3,
      maxTokens: 6144
    };

    return this.generateCompletion(request);
  }

  // Information and statistics methods
  public getAvailableProviders(): string[] {
    return Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.isAvailable)
      .map(([name, _]) => name);
  }

  public getAllModels(): Record<string, string[]> {
    const models: Record<string, string[]> = {};
    
    this.providers.forEach((provider, name) => {
      if (provider.isAvailable) {
        models[name] = provider.models;
      }
    });

    return models;
  }

  public getProviderStats(): ProviderStats[] {
    return Array.from(this.providers.entries()).map(([name, provider]) => {
      const providerRequests = this.requestHistory.filter(r => r.provider === name);
      const successfulRequests = providerRequests.filter(r => r.success);
      
      return {
        name,
        requestCount: providerRequests.length,
        errorCount: providerRequests.length - successfulRequests.length,
        errorRate: providerRequests.length > 0 ? 
          (providerRequests.length - successfulRequests.length) / providerRequests.length : 0,
        averageResponseTime: successfulRequests.length > 0 ?
          successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length : 0,
        isHealthy: provider.isAvailable,
        lastHealthCheck: new Date()
      };
    });
  }

  public getTotalModelCount(): number {
    return Array.from(this.providers.values())
      .reduce((total, provider) => total + provider.models.length, 0);
  }

  public async getModelCapabilities(provider: string, model: string): Promise<any> {
    const providerObj = this.providers.get(provider.toLowerCase());
    if (!providerObj) {
      throw new Error(`Provider ${provider} not found`);
    }

    return providerObj.connector.getModelCapabilities(model);
  }

  public resetStats(): void {
    this.requestHistory = [];
    this.providers.forEach(provider => {
      provider.connector.resetStats();
    });
    this.logger.info('LLM Manager stats reset');
  }

  public async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Destroy all connectors
    this.providers.forEach(provider => {
      provider.connector.destroy();
    });

    this.removeAllListeners();
    this.logger.info('✅ LLM Manager shutdown complete');
  }
}