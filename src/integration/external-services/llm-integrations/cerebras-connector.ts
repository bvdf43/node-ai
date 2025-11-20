/**
 * Cerebras API Connector
 * 
 * Integration with Cerebras AI models including:
 * - qwen-3-coder-480b
 * - qwen-3-32b
 * - qwen-3-235b-a22b-thinking-2507
 * - gpt-oss-120b
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { EventEmitter } from 'events';
import { Logger } from '@utils/helpers/logger';
import { ConfigManager } from '@config/config-manager';

export interface CerebrasModelConfig {
  name: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  topK: number;
  repetitionPenalty: number;
  stopSequences: string[];
  specialCapabilities: string[];
}

export interface CerebrasRequest {
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

export interface CerebrasResponse {
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

export interface CerebrasStreamResponse {
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

export class CerebrasConnector extends EventEmitter {
  private logger: Logger;
  private config: ConfigManager;
  private client: AxiosInstance;
  private apiKey: string;
  private baseURL: string;
  private models: Map<string, CerebrasModelConfig> = new Map();
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
    this.apiKey = this.config.get('CEREBRAS_API_KEY');
    this.baseURL = this.config.get('CEREBRAS_BASE_URL', 'https://api.cerebras.ai/v1/chat/completions');

    if (!this.apiKey) {
      throw new Error('CEREBRAS_API_KEY is required');
    }
  }

  private initializeClient(): void {
    this.client = axios.create({
      baseURL: this.baseURL.replace('/chat/completions', ''),
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Advanced-AGI-System/1.0.0'
      },
      timeout: 180000, // 3 minutes timeout for very large models
      validateStatus: (status) => status < 500
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        this.requestCount++;
        this.logger.debug('Cerebras API Request', {
          method: config.method,
          url: config.url,
          model: config.data?.model
        });
        return config;
      },
      (error) => {
        this.logger.error('Cerebras API Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug('Cerebras API Response', {
          status: response.status,
          model: response.data?.model,
          usage: response.data?.usage
        });
        return response;
      },
      (error) => {
        this.errorCount++;
        this.logger.error('Cerebras API Response Error', {
          status: error.response?.status,
          message: error.response?.data?.error?.message || error.message,
          details: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }

  private initializeModels(): void {
    const modelConfigs: Array<[string, CerebrasModelConfig]> = [
      ['qwen-3-coder-480b', {
        name: 'Qwen 3 Coder 480B',
        maxTokens: 32768,
        temperature: 0.7,
        topP: 0.9,
        topK: 50,
        repetitionPenalty: 1.1,
        stopSequences: [],
        specialCapabilities: ['code-generation', 'code-analysis', 'debugging', 'refactoring', 'documentation']
      }],
      ['qwen-3-32b', {
        name: 'Qwen 3 32B',
        maxTokens: 16384,
        temperature: 0.7,
        topP: 0.9,
        topK: 50,
        repetitionPenalty: 1.1,
        stopSequences: [],
        specialCapabilities: ['general-purpose', 'reasoning', 'conversation', 'analysis']
      }],
      ['qwen-3-235b-a22b-thinking-2507', {
        name: 'Qwen 3 235B A22B Thinking',
        maxTokens: 32768,
        temperature: 0.7,
        topP: 0.9,
        topK: 50,
        repetitionPenalty: 1.1,
        stopSequences: [],
        specialCapabilities: ['advanced-reasoning', 'complex-problem-solving', 'chain-of-thought', 'analytical-thinking']
      }],
      ['gpt-oss-120b', {
        name: 'GPT OSS 120B',
        maxTokens: 16384,
        temperature: 0.7,
        topP: 0.9,
        topK: 50,
        repetitionPenalty: 1.1,
        stopSequences: [],
        specialCapabilities: ['general-purpose', 'creative-writing', 'reasoning', 'conversation']
      }]
    ];

    modelConfigs.forEach(([modelId, config]) => {
      this.models.set(modelId, config);
    });

    this.logger.info(`✅ Initialized ${this.models.size} Cerebras models`);
  }

  public async generateCompletion(
    model: string,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: Partial<CerebrasRequest> = {}
  ): Promise<CerebrasResponse> {
    try {
      const modelConfig = this.models.get(model);
      if (!modelConfig) {
        throw new Error(`Model ${model} not found in Cerebras connector`);
      }

      const request: CerebrasRequest = {
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

      this.logger.debug('Generating Cerebras completion', {
        model,
        messageCount: messages.length,
        maxTokens: request.max_tokens
      });

      const startTime = Date.now();
      const response: AxiosResponse<CerebrasResponse> = await this.client.post('/chat/completions', request);
      const duration = Date.now() - startTime;

      if (response.status !== 200) {
        throw new Error(`Cerebras API error: ${response.status} - ${JSON.stringify(response.data)}`);
      }

      this.logger.info('Cerebras completion generated', {
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
      this.logger.error('Error generating Cerebras completion', {
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
    options: Partial<CerebrasRequest> = {}
  ): Promise<AsyncGenerator<CerebrasStreamResponse, void, unknown>> {
    const modelConfig = this.models.get(model);
    if (!modelConfig) {
      throw new Error(`Model ${model} not found in Cerebras connector`);
    }

    const request: CerebrasRequest = {
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

    this.logger.debug('Starting Cerebras stream completion', {
      model,
      messageCount: messages.length
    });

    try {
      const response = await this.client.post('/chat/completions', request, {
        responseType: 'stream'
      });

      return this.parseStreamResponse(response.data, model);

    } catch (error) {
      this.logger.error('Error starting Cerebras stream completion', {
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
  ): AsyncGenerator<CerebrasStreamResponse, void, unknown> {
    let buffer = '';

    for await (const chunk of stream) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          
          if (data === '[DONE]') {
            this.logger.debug('Cerebras stream completion finished', { model });
            return;
          }

          if (data) {
            try {
              const parsed: CerebrasStreamResponse = JSON.parse(data);
              yield parsed;
            } catch (error) {
              this.logger.warn('Failed to parse Cerebras stream chunk', {
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
    return Array.from(this.models.keys());
  }

  public getModelConfig(model: string): CerebrasModelConfig | undefined {
    return this.models.get(model);
  }

  public getAvailableModels(): string[] {
    return Array.from(this.models.keys());
  }

  public async testConnection(): Promise<boolean> {
    try {
      this.logger.info('Testing Cerebras API connection...');
      
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
        this.logger.info('✅ Cerebras API connection test successful');
        return true;
      }

      throw new Error('Invalid response format');

    } catch (error) {
      this.logger.error('❌ Cerebras API connection test failed', {
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
      capabilities: config.specialCapabilities,
      parameters: {
        temperature: { min: 0.0, max: 2.0, default: config.temperature },
        topP: { min: 0.0, max: 1.0, default: config.topP },
        topK: { min: 1, max: 100, default: config.topK },
        maxTokens: { min: 1, max: config.maxTokens, default: config.maxTokens },
        repetitionPenalty: { min: 0.1, max: 2.0, default: config.repetitionPenalty }
      },
      specialFeatures: this.getModelSpecialFeatures(model)
    };
  }

  private getModelSpecialFeatures(model: string): string[] {
    const features: Record<string, string[]> = {
      'qwen-3-coder-480b': [
        'Massive 480B parameter model optimized for code',
        'Advanced code generation and analysis',
        'Multi-language programming support',
        'Code debugging and optimization',
        'Technical documentation generation'
      ],
      'qwen-3-32b': [
        'Efficient 32B parameter model',
        'Fast inference with good quality',
        'General-purpose capabilities',
        'Balanced performance and speed'
      ],
      'qwen-3-235b-a22b-thinking-2507': [
        'Advanced reasoning and thinking capabilities',
        'Chain-of-thought processing',
        'Complex problem decomposition',
        'Analytical and logical reasoning',
        'Step-by-step problem solving'
      ],
      'gpt-oss-120b': [
        'Large-scale open-source model',
        'Creative and analytical capabilities',
        'Versatile text generation',
        'Strong reasoning abilities'
      ]
    };

    return features[model] || [];
  }

  public getStats(): any {
    return {
      provider: 'Cerebras',
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
      availableModels: this.getAvailableModels().length,
      lastRequestTime: new Date().toISOString()
    };
  }

  public async estimateTokens(text: string): Promise<number> {
    return Math.ceil(text.length / 4);
  }

  public async estimateCost(model: string, promptTokens: number, completionTokens: number): Promise<number> {
    // Cost varies by model size
    const costMultipliers: Record<string, number> = {
      'qwen-3-coder-480b': 0.008, // Highest cost for largest model
      'qwen-3-235b-a22b-thinking-2507': 0.006,
      'gpt-oss-120b': 0.004,
      'qwen-3-32b': 0.002 // Lowest cost for smallest model
    };

    const baseCostPer1kTokens = costMultipliers[model] || 0.003;
    const totalTokens = promptTokens + completionTokens;
    return (totalTokens / 1000) * baseCostPer1kTokens;
  }

  public resetStats(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.logger.info('Cerebras connector stats reset');
  }

  // Specialized methods leveraging Cerebras model strengths
  public async generateAdvancedCode(
    model: string = 'qwen-3-coder-480b',
    specification: string,
    language: string = 'python',
    complexity: 'simple' | 'moderate' | 'complex' = 'moderate'
  ): Promise<string> {
    const complexityPrompts = {
      simple: 'Generate clean, simple code that is easy to understand.',
      moderate: 'Generate well-structured code with proper error handling and documentation.',
      complex: 'Generate sophisticated, production-ready code with advanced patterns, comprehensive error handling, testing, and detailed documentation.'
    };

    const messages = [
      {
        role: 'system' as const,
        content: `You are an expert ${language} developer with access to the most advanced coding capabilities. ${complexityPrompts[complexity]}`
      },
      {
        role: 'user' as const,
        content: `Language: ${language}\nComplexity: ${complexity}\n\nSpecification: ${specification}\n\nPlease generate the code with explanations.`
      }
    ];

    const response = await this.generateCompletion(model, messages, {
      temperature: 0.2,
      max_tokens: model === 'qwen-3-coder-480b' ? 16384 : 8192
    });

    return response.choices[0]?.message?.content || '';
  }

  public async performChainOfThoughtReasoning(
    model: string = 'qwen-3-235b-a22b-thinking-2507',
    problem: string,
    domain?: string
  ): Promise<string> {
    const messages = [
      {
        role: 'system' as const,
        content: `You are an advanced reasoning AI with exceptional analytical capabilities. Use chain-of-thought reasoning to break down complex problems step by step. Think through each step carefully and show your reasoning process.${domain ? ` Focus on the ${domain} domain.` : ''}`
      },
      {
        role: 'user' as const,
        content: `Problem: ${problem}\n\nPlease solve this step by step, showing your chain of thought reasoning process. Break down the problem, analyze each component, and build towards a comprehensive solution.`
      }
    ];

    const response = await this.generateCompletion(model, messages, {
      temperature: 0.3,
      max_tokens: 16384
    });

    return response.choices[0]?.message?.content || '';
  }

  public async analyzeAndDebugCode(
    model: string = 'qwen-3-coder-480b',
    code: string,
    language: string,
    issues?: string[]
  ): Promise<string> {
    let prompt = `Code to analyze and debug:\n\`\`\`${language}\n${code}\n\`\`\`\n\n`;
    
    if (issues && issues.length > 0) {
      prompt += `Specific issues to investigate:\n${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}\n\n`;
    }
    
    prompt += 'Please provide:\n1. Code analysis and potential issues\n2. Bug fixes with explanations\n3. Optimization suggestions\n4. Best practices recommendations';

    const messages = [
      {
        role: 'system' as const,
        content: `You are an expert code analyst and debugger with deep knowledge of ${language}. Provide thorough analysis, identify issues, and suggest improvements.`
      },
      {
        role: 'user' as const,
        content: prompt
      }
    ];

    const response = await this.generateCompletion(model, messages, {
      temperature: 0.1,
      max_tokens: 12288
    });

    return response.choices[0]?.message?.content || '';
  }

  public async generateTechnicalDocumentation(
    model: string = 'qwen-3-coder-480b',
    code: string,
    language: string,
    docType: 'api' | 'user-guide' | 'technical-spec' | 'readme' = 'api'
  ): Promise<string> {
    const docTypePrompts = {
      'api': 'Generate comprehensive API documentation with endpoints, parameters, responses, and examples.',
      'user-guide': 'Generate user-friendly documentation with step-by-step instructions and examples.',
      'technical-spec': 'Generate detailed technical specifications with architecture, design decisions, and implementation details.',
      'readme': 'Generate a comprehensive README with installation, usage, examples, and contribution guidelines.'
    };

    const messages = [
      {
        role: 'system' as const,
        content: `You are a technical documentation expert. ${docTypePrompts[docType]} Make the documentation clear, comprehensive, and well-structured.`
      },
      {
        role: 'user' as const,
        content: `Code to document:\n\`\`\`${language}\n${code}\n\`\`\`\n\nDocumentation type: ${docType}\n\nPlease generate comprehensive documentation.`
      }
    ];

    const response = await this.generateCompletion(model, messages, {
      temperature: 0.3,
      max_tokens: 12288
    });

    return response.choices[0]?.message?.content || '';
  }

  public async optimizeCodePerformance(
    model: string = 'qwen-3-coder-480b',
    code: string,
    language: string,
    optimizationGoals: string[] = ['speed', 'memory', 'readability']
  ): Promise<string> {
    const messages = [
      {
        role: 'system' as const,
        content: `You are a performance optimization expert specializing in ${language}. Analyze code and provide optimized versions focusing on the specified goals while maintaining functionality.`
      },
      {
        role: 'user' as const,
        content: `Code to optimize:\n\`\`\`${language}\n${code}\n\`\`\`\n\nOptimization goals: ${optimizationGoals.join(', ')}\n\nPlease provide:\n1. Performance analysis\n2. Optimized code\n3. Explanation of optimizations\n4. Performance impact estimates`
      }
    ];

    const response = await this.generateCompletion(model, messages, {
      temperature: 0.2,
      max_tokens: 12288
    });

    return response.choices[0]?.message?.content || '';
  }

  public async solveComplexMathProblem(
    model: string = 'qwen-3-235b-a22b-thinking-2507',
    problem: string,
    showSteps: boolean = true
  ): Promise<string> {
    const messages = [
      {
        role: 'system' as const,
        content: showSteps 
          ? 'You are a mathematics expert with advanced problem-solving capabilities. Solve problems step by step with detailed explanations and reasoning.'
          : 'You are a mathematics expert. Provide accurate solutions to mathematical problems.'
      },
      {
        role: 'user' as const,
        content: `Mathematical problem: ${problem}\n\n${showSteps ? 'Please solve this step by step, showing all work and reasoning.' : 'Please provide the solution.'}`
      }
    ];

    const response = await this.generateCompletion(model, messages, {
      temperature: 0.1,
      max_tokens: 8192
    });

    return response.choices[0]?.message?.content || '';
  }

  public destroy(): void {
    this.removeAllListeners();
    this.logger.info('Cerebras connector destroyed');
  }
}