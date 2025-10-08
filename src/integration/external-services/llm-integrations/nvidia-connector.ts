/**
 * NVIDIA API Connector
 * 
 * Integration with NVIDIA's AI models including the specified models:
 * - moonshotai/kimi-k2-instruct-0905
 * - bytedance/seed-oss-36b-instruct
 * - moonshotai/kimi-k2-instruct
 * - qwen/qwen3-next-80b-a3b-thinking
 * - igenius/colosseum_355b_instruct_16k
 * - meta/llama-3.1-405b-instruct
 * - microsoft/phi-3.5-moe-instruct
 * - deepseek-ai/deepseek-r1
 * - qwen/qwen3-next-80b-a3b-instruct
 * - nvidia/nvidia-nemotron-nano-9b-v2
 * - deepseek-ai/deepseek-v3.1
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { EventEmitter } from 'events';
import { Logger } from '@utils/helpers/logger';
import { ConfigManager } from '@config/config-manager';

export interface NVIDIAModelConfig {
  name: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stopSequences: string[];
}

export interface NVIDIARequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
  stream?: boolean;
}

export interface NVIDIAResponse {
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

export interface NVIDIAStreamResponse {
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

export class NVIDIAConnector extends EventEmitter {
  private logger: Logger;
  private config: ConfigManager;
  private client: AxiosInstance;
  private apiKey: string;
  private baseURL: string;
  private models: Map<string, NVIDIAModelConfig> = new Map();
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
    this.apiKey = this.config.get('NVIDIA_API_KEY');
    this.baseURL = this.config.get('NVIDIA_BASE_URL', 'https://integrate.api.nvidia.com/v1');

    if (!this.apiKey) {
      throw new Error('NVIDIA_API_KEY is required');
    }
  }

  private initializeClient(): void {
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Advanced-AGI-System/1.0.0'
      },
      timeout: 60000, // 60 seconds timeout
      validateStatus: (status) => status < 500 // Don't throw on 4xx errors
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        this.requestCount++;
        this.logger.debug('NVIDIA API Request', {
          method: config.method,
          url: config.url,
          model: config.data?.model
        });
        return config;
      },
      (error) => {
        this.logger.error('NVIDIA API Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug('NVIDIA API Response', {
          status: response.status,
          model: response.data?.model,
          usage: response.data?.usage
        });
        return response;
      },
      (error) => {
        this.errorCount++;
        this.logger.error('NVIDIA API Response Error', {
          status: error.response?.status,
          message: error.response?.data?.error?.message || error.message
        });
        return Promise.reject(error);
      }
    );
  }

  private initializeModels(): void {
    const modelConfigs: Array<[string, NVIDIAModelConfig]> = [
      ['moonshotai/kimi-k2-instruct-0905', {
        name: 'Kimi K2 Instruct 0905',
        maxTokens: 4096,
        temperature: 0.7,
        topP: 0.9,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        stopSequences: []
      }],
      ['bytedance/seed-oss-36b-instruct', {
        name: 'Seed OSS 36B Instruct',
        maxTokens: 4096,
        temperature: 0.7,
        topP: 0.9,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        stopSequences: []
      }],
      ['moonshotai/kimi-k2-instruct', {
        name: 'Kimi K2 Instruct',
        maxTokens: 4096,
        temperature: 0.7,
        topP: 0.9,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        stopSequences: []
      }],
      ['qwen/qwen3-next-80b-a3b-thinking', {
        name: 'Qwen3 Next 80B A3B Thinking',
        maxTokens: 8192,
        temperature: 0.7,
        topP: 0.9,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        stopSequences: []
      }],
      ['igenius/colosseum_355b_instruct_16k', {
        name: 'Colosseum 355B Instruct 16K',
        maxTokens: 16384,
        temperature: 0.7,
        topP: 0.9,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        stopSequences: []
      }],
      ['meta/llama-3.1-405b-instruct', {
        name: 'Llama 3.1 405B Instruct',
        maxTokens: 4096,
        temperature: 0.7,
        topP: 0.9,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        stopSequences: []
      }],
      ['microsoft/phi-3.5-moe-instruct', {
        name: 'Phi 3.5 MoE Instruct',
        maxTokens: 4096,
        temperature: 0.7,
        topP: 0.9,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        stopSequences: []
      }],
      ['deepseek-ai/deepseek-r1', {
        name: 'DeepSeek R1',
        maxTokens: 4096,
        temperature: 0.7,
        topP: 0.9,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        stopSequences: []
      }],
      ['qwen/qwen3-next-80b-a3b-instruct', {
        name: 'Qwen3 Next 80B A3B Instruct',
        maxTokens: 8192,
        temperature: 0.7,
        topP: 0.9,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        stopSequences: []
      }],
      ['nvidia/nvidia-nemotron-nano-9b-v2', {
        name: 'NVIDIA Nemotron Nano 9B v2',
        maxTokens: 4096,
        temperature: 0.7,
        topP: 0.9,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        stopSequences: []
      }],
      ['deepseek-ai/deepseek-v3.1', {
        name: 'DeepSeek v3.1',
        maxTokens: 4096,
        temperature: 0.7,
        topP: 0.9,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        stopSequences: []
      }]
    ];

    modelConfigs.forEach(([modelId, config]) => {
      this.models.set(modelId, config);
    });

    this.logger.info(`✅ Initialized ${this.models.size} NVIDIA models`);
  }

  public async generateCompletion(
    model: string,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: Partial<NVIDIARequest> = {}
  ): Promise<NVIDIAResponse> {
    try {
      const modelConfig = this.models.get(model);
      if (!modelConfig) {
        throw new Error(`Model ${model} not found in NVIDIA connector`);
      }

      const request: NVIDIARequest = {
        model,
        messages,
        temperature: options.temperature ?? modelConfig.temperature,
        max_tokens: options.max_tokens ?? modelConfig.maxTokens,
        top_p: options.top_p ?? modelConfig.topP,
        frequency_penalty: options.frequency_penalty ?? modelConfig.frequencyPenalty,
        presence_penalty: options.presence_penalty ?? modelConfig.presencePenalty,
        stop: options.stop ?? modelConfig.stopSequences,
        stream: false
      };

      this.logger.debug('Generating NVIDIA completion', {
        model,
        messageCount: messages.length,
        maxTokens: request.max_tokens
      });

      const startTime = Date.now();
      const response: AxiosResponse<NVIDIAResponse> = await this.client.post('/chat/completions', request);
      const duration = Date.now() - startTime;

      if (response.status !== 200) {
        throw new Error(`NVIDIA API error: ${response.status} - ${response.data}`);
      }

      this.logger.info('NVIDIA completion generated', {
        model,
        duration,
        promptTokens: response.data.usage.prompt_tokens,
        completionTokens: response.data.usage.completion_tokens,
        totalTokens: response.data.usage.total_tokens
      });

      this.emit('completionGenerated', {
        model,
        duration,
        usage: response.data.usage,
        response: response.data
      });

      return response.data;

    } catch (error) {
      this.logger.error('Error generating NVIDIA completion', {
        model,
        error: error.message,
        stack: error.stack
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
    options: Partial<NVIDIARequest> = {}
  ): Promise<AsyncGenerator<NVIDIAStreamResponse, void, unknown>> {
    const modelConfig = this.models.get(model);
    if (!modelConfig) {
      throw new Error(`Model ${model} not found in NVIDIA connector`);
    }

    const request: NVIDIARequest = {
      model,
      messages,
      temperature: options.temperature ?? modelConfig.temperature,
      max_tokens: options.max_tokens ?? modelConfig.maxTokens,
      top_p: options.top_p ?? modelConfig.topP,
      frequency_penalty: options.frequency_penalty ?? modelConfig.frequencyPenalty,
      presence_penalty: options.presence_penalty ?? modelConfig.presencePenalty,
      stop: options.stop ?? modelConfig.stopSequences,
      stream: true
    };

    this.logger.debug('Starting NVIDIA stream completion', {
      model,
      messageCount: messages.length
    });

    try {
      const response = await this.client.post('/chat/completions', request, {
        responseType: 'stream'
      });

      return this.parseStreamResponse(response.data, model);

    } catch (error) {
      this.logger.error('Error starting NVIDIA stream completion', {
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
  ): AsyncGenerator<NVIDIAStreamResponse, void, unknown> {
    let buffer = '';

    for await (const chunk of stream) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            this.logger.debug('NVIDIA stream completion finished', { model });
            return;
          }

          try {
            const parsed: NVIDIAStreamResponse = JSON.parse(data);
            yield parsed;
          } catch (error) {
            this.logger.warn('Failed to parse NVIDIA stream chunk', {
              model,
              data,
              error: error.message
            });
          }
        }
      }
    }
  }

  public async listModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/models');
      
      if (response.status === 200 && response.data.data) {
        const availableModels = response.data.data.map((model: any) => model.id);
        this.logger.info('Retrieved NVIDIA models', {
          count: availableModels.length,
          models: availableModels
        });
        return availableModels;
      }

      // Fallback to configured models
      return Array.from(this.models.keys());

    } catch (error) {
      this.logger.warn('Failed to retrieve NVIDIA models, using configured models', {
        error: error.message
      });
      return Array.from(this.models.keys());
    }
  }

  public getModelConfig(model: string): NVIDIAModelConfig | undefined {
    return this.models.get(model);
  }

  public getAvailableModels(): string[] {
    return Array.from(this.models.keys());
  }

  public async testConnection(): Promise<boolean> {
    try {
      this.logger.info('Testing NVIDIA API connection...');
      
      const testMessages = [
        { role: 'user' as const, content: 'Hello, this is a connection test.' }
      ];

      // Use the first available model for testing
      const testModel = this.getAvailableModels()[0];
      if (!testModel) {
        throw new Error('No models available for testing');
      }

      const response = await this.generateCompletion(testModel, testMessages, {
        max_tokens: 10
      });

      if (response && response.choices && response.choices.length > 0) {
        this.logger.info('✅ NVIDIA API connection test successful');
        return true;
      }

      throw new Error('Invalid response format');

    } catch (error) {
      this.logger.error('❌ NVIDIA API connection test failed', {
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
      supportsFunctionCalling: false, // Most models don't support this yet
      capabilities: [
        'text-generation',
        'conversation',
        'instruction-following',
        'reasoning'
      ],
      parameters: {
        temperature: { min: 0.0, max: 2.0, default: config.temperature },
        topP: { min: 0.0, max: 1.0, default: config.topP },
        maxTokens: { min: 1, max: config.maxTokens, default: config.maxTokens },
        frequencyPenalty: { min: -2.0, max: 2.0, default: config.frequencyPenalty },
        presencePenalty: { min: -2.0, max: 2.0, default: config.presencePenalty }
      }
    };
  }

  public getStats(): any {
    return {
      provider: 'NVIDIA',
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
      availableModels: this.getAvailableModels().length,
      lastRequestTime: new Date().toISOString()
    };
  }

  public async estimateTokens(text: string): Promise<number> {
    // Simple token estimation (roughly 4 characters per token for English)
    return Math.ceil(text.length / 4);
  }

  public async estimateCost(model: string, promptTokens: number, completionTokens: number): Promise<number> {
    // Placeholder cost estimation - in a real implementation, this would use actual pricing
    const baseCostPer1kTokens = 0.002; // $0.002 per 1k tokens as example
    const totalTokens = promptTokens + completionTokens;
    return (totalTokens / 1000) * baseCostPer1kTokens;
  }

  public resetStats(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.logger.info('NVIDIA connector stats reset');
  }

  // Specialized methods for different use cases
  public async generateCodeCompletion(
    model: string,
    prompt: string,
    language: string = 'javascript'
  ): Promise<string> {
    const messages = [
      {
        role: 'system' as const,
        content: `You are an expert ${language} programmer. Generate clean, efficient, and well-commented code.`
      },
      {
        role: 'user' as const,
        content: prompt
      }
    ];

    const response = await this.generateCompletion(model, messages, {
      temperature: 0.2, // Lower temperature for more deterministic code
      max_tokens: 2048
    });

    return response.choices[0]?.message?.content || '';
  }

  public async generateReasoningResponse(
    model: string,
    question: string,
    context?: string
  ): Promise<string> {
    const messages = [
      {
        role: 'system' as const,
        content: 'You are an expert reasoning assistant. Think step by step and provide clear, logical explanations.'
      }
    ];

    if (context) {
      messages.push({
        role: 'user' as const,
        content: `Context: ${context}\n\nQuestion: ${question}`
      });
    } else {
      messages.push({
        role: 'user' as const,
        content: question
      });
    }

    const response = await this.generateCompletion(model, messages, {
      temperature: 0.7,
      max_tokens: 4096
    });

    return response.choices[0]?.message?.content || '';
  }

  public async generateCreativeContent(
    model: string,
    prompt: string,
    creativity: number = 0.8
  ): Promise<string> {
    const messages = [
      {
        role: 'system' as const,
        content: 'You are a creative assistant capable of generating original and engaging content.'
      },
      {
        role: 'user' as const,
        content: prompt
      }
    ];

    const response = await this.generateCompletion(model, messages, {
      temperature: Math.min(1.0, creativity),
      max_tokens: 4096
    });

    return response.choices[0]?.message?.content || '';
  }

  public destroy(): void {
    this.removeAllListeners();
    this.logger.info('NVIDIA connector destroyed');
  }
}