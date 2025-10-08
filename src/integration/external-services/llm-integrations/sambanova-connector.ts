/**
 * SambaNova API Connector
 * 
 * Integration with SambaNova's AI models including:
 * - DeepSeek-V3.1-Terminus
 * - DeepSeek-V3.1
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { EventEmitter } from 'events';
import { Logger } from '@utils/helpers/logger';
import { ConfigManager } from '@config/config-manager';

export interface SambaNovaModelConfig {
  name: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  topK: number;
  repetitionPenalty: number;
  stopSequences: string[];
}

export interface SambaNovaRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
  repetition_penalty?: number;
  stop?: string[];
  stream?: boolean;
}

export interface SambaNovaResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface SambaNovaStreamResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
}

export class SambaNovaConnector extends EventEmitter {
  private logger: Logger;
  private config: ConfigManager;
  private client: AxiosInstance;
  private apiKey: string;
  private baseURL: string;
  private models: Map<string, SambaNovaModelConfig> = new Map();
  private requestCount: number = 0;
  private errorCount: number = 0;

  constructor() {
    super();
    this.logger = Logger.getInstance();
    this.config = ConfigManager.getInstance();
    this.initializeConfiguration();
    this.initializeClient();
    this.initializeModels();
  }

  private initializeConfiguration(): void {
    this.apiKey = this.config.get('SAMBANOVA_API_KEY');
    this.baseURL = this.config.get('SAMBANOVA_BASE_URL', 'https://api.sambanova.ai/v1/chat/completions');

    if (!this.apiKey) {
      throw new Error('SAMBANOVA_API_KEY is required');
    }
  }

  private initializeClient(): void {
    this.client = axios.create({
      baseURL: this.baseURL.replace('/chat/completions', ''), // Remove endpoint from base URL
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Advanced-AGI-System/1.0.0'
      },
      timeout: 120000, // 2 minutes timeout for large models
      validateStatus: (status) => status < 500
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        this.requestCount++;
        this.logger.debug('SambaNova API Request', {
          method: config.method,
          url: config.url,
          model: config.data?.model
        });
        return config;
      },
      (error) => {
        this.logger.error('SambaNova API Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug('SambaNova API Response', {
          status: response.status,
          model: response.data?.model,
          usage: response.data?.usage
        });
        return response;
      },
      (error) => {
        this.errorCount++;
        this.logger.error('SambaNova API Response Error', {
          status: error.response?.status,
          message: error.response?.data?.error?.message || error.message,
          details: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }

  private initializeModels(): void {
    const modelConfigs: Array<[string, SambaNovaModelConfig]> = [
      ['DeepSeek-V3.1-Terminus', {
        name: 'DeepSeek V3.1 Terminus',
        maxTokens: 8192,
        temperature: 0.7,
        topP: 0.9,
        topK: 50,
        repetitionPenalty: 1.1,
        stopSequences: []
      }],
      ['DeepSeek-V3.1', {
        name: 'DeepSeek V3.1',
        maxTokens: 8192,
        temperature: 0.7,
        topP: 0.9,
        topK: 50,
        repetitionPenalty: 1.1,
        stopSequences: []
      }]
    ];

    modelConfigs.forEach(([modelId, config]) => {
      this.models.set(modelId, config);
    });

    this.logger.info(`✅ Initialized ${this.models.size} SambaNova models`);
  }

  public async generateCompletion(
    model: string,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: Partial<SambaNovaRequest> = {}
  ): Promise<SambaNovaResponse> {
    try {
      const modelConfig = this.models.get(model);
      if (!modelConfig) {
        throw new Error(`Model ${model} not found in SambaNova connector`);
      }

      const request: SambaNovaRequest = {
        model,
        messages,
        temperature: options.temperature ?? modelConfig.temperature,
        max_tokens: options.max_tokens ?? modelConfig.maxTokens,
        top_p: options.top_p ?? modelConfig.topP,
        top_k: options.top_k ?? modelConfig.topK,
        repetition_penalty: options.repetition_penalty ?? modelConfig.repetitionPenalty,
        stop: options.stop ?? modelConfig.stopSequences,
        stream: false
      };

      this.logger.debug('Generating SambaNova completion', {
        model,
        messageCount: messages.length,
        maxTokens: request.max_tokens
      });

      const startTime = Date.now();
      const response: AxiosResponse<SambaNovaResponse> = await this.client.post('/chat/completions', request);
      const duration = Date.now() - startTime;

      if (response.status !== 200) {
        throw new Error(`SambaNova API error: ${response.status} - ${JSON.stringify(response.data)}`);
      }

      this.logger.info('SambaNova completion generated', {
        model,
        duration,
        promptTokens: response.data.usage?.prompt_tokens,
        completionTokens: response.data.usage?.completion_tokens,
        totalTokens: response.data.usage?.total_tokens
      });

      this.emit('completionGenerated', {
        model,
        duration,
        usage: response.data.usage,
        response: response.data
      });

      return response.data;

    } catch (error) {
      this.logger.error('Error generating SambaNova completion', {
        model,
        error: error.message,
        response: error.response?.data
      });

      this.emit('completionError', {
        model,
        error: error.message,
        messages
      });

      throw error;
    }
  }

  public async generateStreamCompletion(
    model: string,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: Partial<SambaNovaRequest> = {}
  ): Promise<AsyncGenerator<SambaNovaStreamResponse, void, unknown>> {
    const modelConfig = this.models.get(model);
    if (!modelConfig) {
      throw new Error(`Model ${model} not found in SambaNova connector`);
    }

    const request: SambaNovaRequest = {
      model,
      messages,
      temperature: options.temperature ?? modelConfig.temperature,
      max_tokens: options.max_tokens ?? modelConfig.maxTokens,
      top_p: options.top_p ?? modelConfig.topP,
      top_k: options.top_k ?? modelConfig.topK,
      repetition_penalty: options.repetition_penalty ?? modelConfig.repetitionPenalty,
      stop: options.stop ?? modelConfig.stopSequences,
      stream: true
    };

    this.logger.debug('Starting SambaNova stream completion', {
      model,
      messageCount: messages.length
    });

    try {
      const response = await this.client.post('/chat/completions', request, {
        responseType: 'stream'
      });

      return this.parseStreamResponse(response.data, model);

    } catch (error) {
      this.logger.error('Error starting SambaNova stream completion', {
        model,
        error: error.message
      });

      this.emit('streamError', {
        model,
        error: error.message,
        messages
      });

      throw error;
    }
  }

  private async* parseStreamResponse(
    stream: any,
    model: string
  ): AsyncGenerator<SambaNovaStreamResponse, void, unknown> {
    let buffer = '';

    for await (const chunk of stream) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          
          if (data === '[DONE]') {
            this.logger.debug('SambaNova stream completion finished', { model });
            return;
          }

          if (data) {
            try {
              const parsed: SambaNovaStreamResponse = JSON.parse(data);
              yield parsed;
            } catch (error) {
              this.logger.warn('Failed to parse SambaNova stream chunk', {
                model,
                data,
                error: error.message
              });
            }
          }
        }
      }
    }
  }

  public async listModels(): Promise<string[]> {
    try {
      // SambaNova might not have a models endpoint, so we return configured models
      return Array.from(this.models.keys());
    } catch (error) {
      this.logger.warn('Failed to retrieve SambaNova models, using configured models', {
        error: error.message
      });
      return Array.from(this.models.keys());
    }
  }

  public getModelConfig(model: string): SambaNovaModelConfig | undefined {
    return this.models.get(model);
  }

  public getAvailableModels(): string[] {
    return Array.from(this.models.keys());
  }

  public async testConnection(): Promise<boolean> {
    try {
      this.logger.info('Testing SambaNova API connection...');
      
      const testMessages = [
        { role: 'user' as const, content: 'Hello, this is a connection test. Please respond briefly.' }
      ];

      const testModel = this.getAvailableModels()[0];
      if (!testModel) {
        throw new Error('No models available for testing');
      }

      const response = await this.generateCompletion(testModel, testMessages, {
        max_tokens: 20
      });

      if (response && response.choices && response.choices.length > 0) {
        this.logger.info('✅ SambaNova API connection test successful');
        return true;
      }

      throw new Error('Invalid response format');

    } catch (error) {
      this.logger.error('❌ SambaNova API connection test failed', {
        error: error.message
      });
      return false;
    }
  }

  public async getModelCapabilities(model: string): Promise<any> {
    const config = this.models.get(model);
    if (!config) {
      throw new Error(`Model ${model} not found`);
    }

    return {
      name: config.name,
      maxTokens: config.maxTokens,
      supportsStreaming: true,
      supportsSystemMessages: true,
      supportsFunctionCalling: false,
      capabilities: [
        'text-generation',
        'conversation',
        'instruction-following',
        'reasoning',
        'code-generation',
        'mathematical-reasoning'
      ],
      parameters: {
        temperature: { min: 0.0, max: 2.0, default: config.temperature },
        topP: { min: 0.0, max: 1.0, default: config.topP },
        topK: { min: 1, max: 100, default: config.topK },
        maxTokens: { min: 1, max: config.maxTokens, default: config.maxTokens },
        repetitionPenalty: { min: 0.1, max: 2.0, default: config.repetitionPenalty }
      },
      specialFeatures: [
        'Advanced reasoning capabilities',
        'Code understanding and generation',
        'Mathematical problem solving',
        'Long context understanding'
      ]
    };
  }

  public getStats(): any {
    return {
      provider: 'SambaNova',
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
      availableModels: this.getAvailableModels().length,
      lastRequestTime: new Date().toISOString()
    };
  }

  public async estimateTokens(text: string): Promise<number> {
    // Token estimation for SambaNova models (similar to other models)
    return Math.ceil(text.length / 4);
  }

  public async estimateCost(model: string, promptTokens: number, completionTokens: number): Promise<number> {
    // Placeholder cost estimation
    const baseCostPer1kTokens = 0.003; // Higher cost for advanced models
    const totalTokens = promptTokens + completionTokens;
    return (totalTokens / 1000) * baseCostPer1kTokens;
  }

  public resetStats(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.logger.info('SambaNova connector stats reset');
  }

  // Specialized methods for SambaNova's strengths
  public async generateAdvancedReasoning(
    model: string,
    problem: string,
    context?: string
  ): Promise<string> {
    const messages = [
      {
        role: 'system' as const,
        content: 'You are an advanced reasoning AI with exceptional analytical capabilities. Break down complex problems step by step, show your reasoning process, and provide comprehensive solutions.'
      }
    ];

    if (context) {
      messages.push({
        role: 'user' as const,
        content: `Context: ${context}\n\nProblem to solve: ${problem}\n\nPlease provide a detailed step-by-step analysis and solution.`
      });
    } else {
      messages.push({
        role: 'user' as const,
        content: `Problem to solve: ${problem}\n\nPlease provide a detailed step-by-step analysis and solution.`
      });
    }

    const response = await this.generateCompletion(model, messages, {
      temperature: 0.3, // Lower temperature for more focused reasoning
      max_tokens: 6144
    });

    return response.choices[0]?.message?.content || '';
  }

  public async generateMathematicalSolution(
    model: string,
    problem: string,
    showWork: boolean = true
  ): Promise<string> {
    const messages = [
      {
        role: 'system' as const,
        content: showWork 
          ? 'You are a mathematics expert. Solve problems step by step, showing all work and explaining each step clearly.'
          : 'You are a mathematics expert. Provide accurate solutions to mathematical problems.'
      },
      {
        role: 'user' as const,
        content: problem
      }
    ];

    const response = await this.generateCompletion(model, messages, {
      temperature: 0.1, // Very low temperature for mathematical accuracy
      max_tokens: 4096
    });

    return response.choices[0]?.message?.content || '';
  }

  public async generateCodeWithExplanation(
    model: string,
    requirement: string,
    language: string = 'python',
    includeTests: boolean = false
  ): Promise<string> {
    const messages = [
      {
        role: 'system' as const,
        content: `You are an expert ${language} programmer. Generate clean, efficient, well-documented code with detailed explanations.`
      },
      {
        role: 'user' as const,
        content: `Requirement: ${requirement}\n\nLanguage: ${language}\n${includeTests ? 'Please include unit tests.' : ''}\n\nProvide the code with detailed explanations of the approach and implementation.`
      }
    ];

    const response = await this.generateCompletion(model, messages, {
      temperature: 0.2,
      max_tokens: 6144
    });

    return response.choices[0]?.message?.content || '';
  }

  public async analyzeComplexData(
    model: string,
    data: string,
    analysisType: 'statistical' | 'pattern' | 'trend' | 'comprehensive' = 'comprehensive'
  ): Promise<string> {
    const analysisPrompts = {
      statistical: 'Perform a statistical analysis of the provided data. Include descriptive statistics, distributions, and key insights.',
      pattern: 'Identify patterns, correlations, and relationships in the provided data. Highlight significant findings.',
      trend: 'Analyze trends and temporal patterns in the data. Identify growth patterns, seasonality, and anomalies.',
      comprehensive: 'Perform a comprehensive analysis including statistical analysis, pattern recognition, trend analysis, and actionable insights.'
    };

    const messages = [
      {
        role: 'system' as const,
        content: 'You are a data analysis expert with advanced analytical capabilities. Provide thorough, accurate, and insightful analysis.'
      },
      {
        role: 'user' as const,
        content: `Data to analyze:\n${data}\n\nAnalysis requested: ${analysisPrompts[analysisType]}`
      }
    ];

    const response = await this.generateCompletion(model, messages, {
      temperature: 0.3,
      max_tokens: 8192
    });

    return response.choices[0]?.message?.content || '';
  }

  public async generateResearchInsights(
    model: string,
    topic: string,
    sources?: string[],
    focusAreas?: string[]
  ): Promise<string> {
    let prompt = `Research topic: ${topic}\n\n`;
    
    if (sources && sources.length > 0) {
      prompt += `Available sources:\n${sources.map((source, i) => `${i + 1}. ${source}`).join('\n')}\n\n`;
    }
    
    if (focusAreas && focusAreas.length > 0) {
      prompt += `Focus areas: ${focusAreas.join(', ')}\n\n`;
    }
    
    prompt += 'Please provide comprehensive research insights, key findings, implications, and recommendations.';

    const messages = [
      {
        role: 'system' as const,
        content: 'You are a research analyst with expertise across multiple domains. Provide thorough, well-structured research insights with critical analysis and actionable recommendations.'
      },
      {
        role: 'user' as const,
        content: prompt
      }
    ];

    const response = await this.generateCompletion(model, messages, {
      temperature: 0.4,
      max_tokens: 8192
    });

    return response.choices[0]?.message?.content || '';
  }

  public destroy(): void {
    this.removeAllListeners();
    this.logger.info('SambaNova connector destroyed');
  }
}