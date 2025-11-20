/**
 * Meta Learning Engine - Learning How to Learn
 * 
 * This module implements meta-learning capabilities that allow the system
 * to learn from its learning experiences and improve its learning strategies.
 */

import { EventEmitter } from 'events';
import { Logger } from '@utils/helpers/logger';
import { ConfigManager } from '@config/config-manager';
import { LearningExperience, Feedback, Lesson } from '@utils/types/agi-types';

export interface MetaLearningStrategy {
  id: string;
  name: string;
  description: string;
  effectiveness: number;
  applicability: string[];
  parameters: Record<string, any>;
  usageCount: number;
  successRate: number;
  lastUsed: Date;
}

export interface LearningPattern {
  id: string;
  pattern: string;
  frequency: number;
  contexts: string[];
  outcomes: string[];
  confidence: number;
  discovered: Date;
}

export interface MetaKnowledge {
  strategies: Map<string, MetaLearningStrategy>;
  patterns: Map<string, LearningPattern>;
  domainExpertise: Map<string, number>;
  learningHistory: LearningExperience[];
  adaptationRules: AdaptationRule[];
}

export interface AdaptationRule {
  id: string;
  condition: string;
  action: string;
  confidence: number;
  applications: number;
  successRate: number;
}

export interface MetaLearningMetrics {
  totalExperiences: number;
  averageLearningRate: number;
  strategyEffectiveness: Record<string, number>;
  domainProgression: Record<string, number>;
  adaptationSuccess: number;
  knowledgeTransfer: number;
}

export class MetaLearningEngine extends EventEmitter {
  private logger: Logger;
  private config: ConfigManager;
  private metaKnowledge: MetaKnowledge;
  private metrics: MetaLearningMetrics;
  private isActive: boolean = false;
  private learningLoop: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.logger = Logger.getInstance();
    this.config = ConfigManager.getInstance();
    this.initializeMetaKnowledge();
    this.initializeMetrics();
  }

  public async initialize(): Promise<void> {
    try {
      this.logger.info('🧠 Initializing Meta Learning Engine...');

      // Load existing meta-knowledge
      await this.loadMetaKnowledge();

      // Initialize learning strategies
      await this.initializeLearningStrategies();

      // Start meta-learning loop
      this.startMetaLearningLoop();

      this.isActive = true;
      this.logger.info('✅ Meta Learning Engine initialized');
      this.emit('initialized', this.metaKnowledge);

    } catch (error) {
      this.logger.error('Failed to initialize Meta Learning Engine:', error);
      throw error;
    }
  }

  public async learn(input: any, output: any, feedback?: Feedback): Promise<void> {
    try {
      // Create learning experience
      const experience = this.createLearningExperience(input, output, feedback);

      // Add to learning history
      this.metaKnowledge.learningHistory.push(experience);
      this.maintainLearningHistory();

      // Extract lessons from experience
      const lessons = await this.extractLessons(experience);
      experience.lessons = lessons;

      // Update domain expertise
      await this.updateDomainExpertise(experience);

      // Discover new patterns
      await this.discoverPatterns(experience);

      // Adapt learning strategies
      await this.adaptLearningStrategies(experience);

      // Update metrics
      this.updateMetrics(experience);

      this.emit('experienceLearned', experience);
      this.logger.debug('Learning experience processed', {
        experienceId: experience.id,
        domain: experience.context.domain,
        outcome: experience.outcome
      });

    } catch (error) {
      this.logger.error('Error in meta-learning process:', error);
      this.emit('learningError', { input, output, error });
    }
  }

  private createLearningExperience(input: any, output: any, feedback?: Feedback): LearningExperience {
    const context = this.extractLearningContext(input, output);
    const outcome = this.determineLearningOutcome(output, feedback);

    return {
      id: this.generateExperienceId(),
      input,
      output,
      feedback,
      timestamp: new Date(),
      context,
      outcome,
      lessons: []
    };
  }

  private extractLearningContext(input: any, output: any): any {
    return {
      domain: this.identifyDomain(input),
      difficulty: this.assessDifficulty(input, output),
      novelty: this.assessNovelty(input),
      importance: this.assessImportance(input, output),
      relatedExperiences: this.findRelatedExperiences(input)
    };
  }

  private identifyDomain(input: any): string {
    // Simple domain identification based on input characteristics
    const inputStr = JSON.stringify(input).toLowerCase();
    
    if (inputStr.includes('code') || inputStr.includes('programming')) return 'programming';
    if (inputStr.includes('math') || inputStr.includes('calculation')) return 'mathematics';
    if (inputStr.includes('reason') || inputStr.includes('logic')) return 'reasoning';
    if (inputStr.includes('language') || inputStr.includes('text')) return 'language';
    if (inputStr.includes('image') || inputStr.includes('visual')) return 'vision';
    
    return 'general';
  }

  private assessDifficulty(input: any, output: any): number {
    let difficulty = 0.5;

    // Assess based on input complexity
    const inputComplexity = this.calculateComplexity(input);
    difficulty += inputComplexity * 0.3;

    // Assess based on output confidence
    if (output.confidence) {
      difficulty += (1 - output.confidence) * 0.2;
    }

    // Assess based on processing time
    if (output.processingTime) {
      const normalizedTime = Math.min(1, output.processingTime / 5000); // 5 seconds as max
      difficulty += normalizedTime * 0.2;
    }

    return Math.min(1, difficulty);
  }

  private assessNovelty(input: any): number {
    const recentExperiences = this.metaKnowledge.learningHistory.slice(-50);
    let novelty = 1.0;

    for (const experience of recentExperiences) {
      const similarity = this.calculateSimilarity(input, experience.input);
      novelty = Math.min(novelty, 1 - similarity);
    }

    return novelty;
  }

  private assessImportance(input: any, output: any): number {
    let importance = 0.5;

    // Higher importance for successful outcomes
    if (output.success || (output.confidence && output.confidence > 0.8)) {
      importance += 0.2;
    }

    // Higher importance for complex tasks
    const complexity = this.calculateComplexity(input);
    importance += complexity * 0.2;

    // Higher importance for novel experiences
    const novelty = this.assessNovelty(input);
    importance += novelty * 0.1;

    return Math.min(1, importance);
  }

  private findRelatedExperiences(input: any): string[] {
    const relatedIds: string[] = [];
    const recentExperiences = this.metaKnowledge.learningHistory.slice(-100);

    for (const experience of recentExperiences) {
      const similarity = this.calculateSimilarity(input, experience.input);
      if (similarity > 0.6) {
        relatedIds.push(experience.id);
      }
    }

    return relatedIds.slice(0, 10); // Limit to 10 most related
  }

  private determineLearningOutcome(output: any, feedback?: Feedback): 'success' | 'failure' | 'partial' {
    if (feedback) {
      if (feedback.type === 'positive' && feedback.score > 0.7) return 'success';
      if (feedback.type === 'negative' && feedback.score < 0.3) return 'failure';
      return 'partial';
    }

    if (output.success === true) return 'success';
    if (output.success === false) return 'failure';
    if (output.confidence && output.confidence > 0.8) return 'success';
    if (output.confidence && output.confidence < 0.3) return 'failure';

    return 'partial';
  }

  private async extractLessons(experience: LearningExperience): Promise<Lesson[]> {
    const lessons: Lesson[] = [];

    // Extract lessons based on outcome
    if (experience.outcome === 'success') {
      lessons.push(...this.extractSuccessLessons(experience));
    } else if (experience.outcome === 'failure') {
      lessons.push(...this.extractFailureLessons(experience));
    }

    // Extract domain-specific lessons
    lessons.push(...this.extractDomainLessons(experience));

    // Extract strategy lessons
    lessons.push(...this.extractStrategyLessons(experience));

    return lessons;
  }

  private extractSuccessLessons(experience: LearningExperience): Lesson[] {
    const lessons: Lesson[] = [];

    lessons.push({
      id: this.generateLessonId(),
      description: `Successful approach in ${experience.context.domain} domain`,
      confidence: 0.8,
      applicability: [experience.context.domain],
      evidence: [{
        type: 'empirical',
        strength: 0.9,
        description: 'Direct successful outcome',
        source: experience.id
      }]
    });

    if (experience.context.difficulty > 0.7) {
      lessons.push({
        id: this.generateLessonId(),
        description: 'Effective handling of high-difficulty tasks',
        confidence: 0.7,
        applicability: ['high-difficulty'],
        evidence: [{
          type: 'empirical',
          strength: 0.8,
          description: 'Success on difficult task',
          source: experience.id
        }]
      });
    }

    return lessons;
  }

  private extractFailureLessons(experience: LearningExperience): Lesson[] {
    const lessons: Lesson[] = [];

    lessons.push({
      id: this.generateLessonId(),
      description: `Approach to avoid in ${experience.context.domain} domain`,
      confidence: 0.7,
      applicability: [experience.context.domain],
      evidence: [{
        type: 'empirical',
        strength: 0.8,
        description: 'Direct failure outcome',
        source: experience.id
      }]
    });

    if (experience.feedback && experience.feedback.comments) {
      lessons.push({
        id: this.generateLessonId(),
        description: `Specific improvement needed: ${experience.feedback.comments}`,
        confidence: 0.8,
        applicability: [experience.context.domain],
        evidence: [{
          type: 'observational',
          strength: 0.9,
          description: 'Direct feedback provided',
          source: experience.id
        }]
      });
    }

    return lessons;
  }

  private extractDomainLessons(experience: LearningExperience): Lesson[] {
    const lessons: Lesson[] = [];
    const domain = experience.context.domain;

    // Check for domain-specific patterns
    const domainExperiences = this.metaKnowledge.learningHistory.filter(
      exp => exp.context.domain === domain
    );

    if (domainExperiences.length >= 5) {
      const successRate = domainExperiences.filter(exp => exp.outcome === 'success').length / domainExperiences.length;
      
      if (successRate > 0.8) {
        lessons.push({
          id: this.generateLessonId(),
          description: `High proficiency achieved in ${domain} domain`,
          confidence: 0.9,
          applicability: [domain],
          evidence: [{
            type: 'empirical',
            strength: 0.9,
            description: `Success rate: ${(successRate * 100).toFixed(1)}%`,
            source: 'domain-analysis'
          }]
        });
      }
    }

    return lessons;
  }

  private extractStrategyLessons(experience: LearningExperience): Lesson[] {
    const lessons: Lesson[] = [];

    // Analyze which strategies were effective
    const usedStrategies = this.identifyUsedStrategies(experience);
    
    for (const strategyId of usedStrategies) {
      const strategy = this.metaKnowledge.strategies.get(strategyId);
      if (strategy) {
        const effectiveness = experience.outcome === 'success' ? 1.0 : 
                            experience.outcome === 'partial' ? 0.5 : 0.0;

        lessons.push({
          id: this.generateLessonId(),
          description: `Strategy ${strategy.name} effectiveness: ${effectiveness}`,
          confidence: 0.7,
          applicability: strategy.applicability,
          evidence: [{
            type: 'empirical',
            strength: 0.8,
            description: `Strategy application result`,
            source: experience.id
          }]
        });
      }
    }

    return lessons;
  }

  private identifyUsedStrategies(experience: LearningExperience): string[] {
    // Simple strategy identification based on experience characteristics
    const strategies: string[] = [];

    if (experience.context.difficulty > 0.7) {
      strategies.push('complex-problem-solving');
    }

    if (experience.context.novelty > 0.8) {
      strategies.push('novel-situation-handling');
    }

    if (experience.context.relatedExperiences.length > 0) {
      strategies.push('experience-transfer');
    }

    return strategies;
  }

  private async updateDomainExpertise(experience: LearningExperience): Promise<void> {
    const domain = experience.context.domain;
    const currentExpertise = this.metaKnowledge.domainExpertise.get(domain) || 0.1;

    let expertiseChange = 0;
    if (experience.outcome === 'success') {
      expertiseChange = 0.05 * (1 - currentExpertise); // Diminishing returns
    } else if (experience.outcome === 'failure') {
      expertiseChange = -0.02;
    } else {
      expertiseChange = 0.01;
    }

    const newExpertise = Math.max(0.1, Math.min(1.0, currentExpertise + expertiseChange));
    this.metaKnowledge.domainExpertise.set(domain, newExpertise);

    this.emit('expertiseUpdated', { domain, oldLevel: currentExpertise, newLevel: newExpertise });
  }

  private async discoverPatterns(experience: LearningExperience): Promise<void> {
    // Look for recurring patterns in learning experiences
    const recentExperiences = this.metaKnowledge.learningHistory.slice(-20);
    
    // Pattern: Success in specific contexts
    const successPattern = this.findSuccessPattern(recentExperiences);
    if (successPattern) {
      this.addOrUpdatePattern(successPattern);
    }

    // Pattern: Common failure modes
    const failurePattern = this.findFailurePattern(recentExperiences);
    if (failurePattern) {
      this.addOrUpdatePattern(failurePattern);
    }

    // Pattern: Learning progression
    const progressionPattern = this.findProgressionPattern(recentExperiences);
    if (progressionPattern) {
      this.addOrUpdatePattern(progressionPattern);
    }
  }

  private findSuccessPattern(experiences: LearningExperience[]): LearningPattern | null {
    const successExperiences = experiences.filter(exp => exp.outcome === 'success');
    if (successExperiences.length < 3) return null;

    // Find common characteristics
    const commonDomains = this.findCommonValues(successExperiences.map(exp => exp.context.domain));
    const commonDifficulties = this.findCommonRanges(successExperiences.map(exp => exp.context.difficulty));

    if (commonDomains.length > 0 || commonDifficulties.length > 0) {
      return {
        id: this.generatePatternId(),
        pattern: `Success pattern: ${commonDomains.join(', ')} domains, difficulty ${commonDifficulties.join('-')}`,
        frequency: successExperiences.length,
        contexts: commonDomains,
        outcomes: ['success'],
        confidence: 0.8,
        discovered: new Date()
      };
    }

    return null;
  }

  private findFailurePattern(experiences: LearningExperience[]): LearningPattern | null {
    const failureExperiences = experiences.filter(exp => exp.outcome === 'failure');
    if (failureExperiences.length < 2) return null;

    const commonDomains = this.findCommonValues(failureExperiences.map(exp => exp.context.domain));
    const commonDifficulties = this.findCommonRanges(failureExperiences.map(exp => exp.context.difficulty));

    if (commonDomains.length > 0 || commonDifficulties.length > 0) {
      return {
        id: this.generatePatternId(),
        pattern: `Failure pattern: ${commonDomains.join(', ')} domains, difficulty ${commonDifficulties.join('-')}`,
        frequency: failureExperiences.length,
        contexts: commonDomains,
        outcomes: ['failure'],
        confidence: 0.7,
        discovered: new Date()
      };
    }

    return null;
  }

  private findProgressionPattern(experiences: LearningExperience[]): LearningPattern | null {
    if (experiences.length < 5) return null;

    // Check for improvement over time in specific domains
    const domainGroups = this.groupByDomain(experiences);
    
    for (const [domain, domainExperiences] of domainGroups) {
      if (domainExperiences.length >= 3) {
        const isImproving = this.checkImprovement(domainExperiences);
        if (isImproving) {
          return {
            id: this.generatePatternId(),
            pattern: `Learning progression in ${domain} domain`,
            frequency: domainExperiences.length,
            contexts: [domain],
            outcomes: ['improvement'],
            confidence: 0.8,
            discovered: new Date()
          };
        }
      }
    }

    return null;
  }

  private addOrUpdatePattern(pattern: LearningPattern): void {
    const existingPattern = Array.from(this.metaKnowledge.patterns.values())
      .find(p => p.pattern === pattern.pattern);

    if (existingPattern) {
      existingPattern.frequency += 1;
      existingPattern.confidence = Math.min(1.0, existingPattern.confidence + 0.1);
    } else {
      this.metaKnowledge.patterns.set(pattern.id, pattern);
    }

    this.emit('patternDiscovered', pattern);
  }

  private async adaptLearningStrategies(experience: LearningExperience): Promise<void> {
    // Update strategy effectiveness based on experience
    const usedStrategies = this.identifyUsedStrategies(experience);
    
    for (const strategyId of usedStrategies) {
      const strategy = this.metaKnowledge.strategies.get(strategyId);
      if (strategy) {
        strategy.usageCount += 1;
        strategy.lastUsed = new Date();

        if (experience.outcome === 'success') {
          strategy.successRate = (strategy.successRate * (strategy.usageCount - 1) + 1) / strategy.usageCount;
        } else if (experience.outcome === 'failure') {
          strategy.successRate = (strategy.successRate * (strategy.usageCount - 1) + 0) / strategy.usageCount;
        } else {
          strategy.successRate = (strategy.successRate * (strategy.usageCount - 1) + 0.5) / strategy.usageCount;
        }

        strategy.effectiveness = strategy.successRate;
      }
    }

    // Create new adaptation rules if patterns are detected
    await this.createAdaptationRules(experience);
  }

  private async createAdaptationRules(experience: LearningExperience): Promise<void> {
    // Create rules based on successful patterns
    if (experience.outcome === 'success' && experience.context.difficulty > 0.7) {
      const rule: AdaptationRule = {
        id: this.generateRuleId(),
        condition: `domain=${experience.context.domain} AND difficulty>0.7`,
        action: 'apply-complex-problem-solving-strategy',
        confidence: 0.7,
        applications: 1,
        successRate: 1.0
      };

      this.metaKnowledge.adaptationRules.push(rule);
    }

    // Create rules based on failure patterns
    if (experience.outcome === 'failure' && experience.context.novelty > 0.8) {
      const rule: AdaptationRule = {
        id: this.generateRuleId(),
        condition: `novelty>0.8`,
        action: 'increase-exploration-and-caution',
        confidence: 0.6,
        applications: 1,
        successRate: 0.0
      };

      this.metaKnowledge.adaptationRules.push(rule);
    }
  }

  private updateMetrics(experience: LearningExperience): void {
    this.metrics.totalExperiences += 1;

    // Update average learning rate
    const learningRate = this.calculateLearningRate(experience);
    this.metrics.averageLearningRate = 
      (this.metrics.averageLearningRate * (this.metrics.totalExperiences - 1) + learningRate) / 
      this.metrics.totalExperiences;

    // Update domain progression
    const domain = experience.context.domain;
    const expertise = this.metaKnowledge.domainExpertise.get(domain) || 0.1;
    this.metrics.domainProgression[domain] = expertise;

    // Update strategy effectiveness
    const usedStrategies = this.identifyUsedStrategies(experience);
    for (const strategyId of usedStrategies) {
      const strategy = this.metaKnowledge.strategies.get(strategyId);
      if (strategy) {
        this.metrics.strategyEffectiveness[strategyId] = strategy.effectiveness;
      }
    }
  }

  private calculateLearningRate(experience: LearningExperience): number {
    let rate = 0.5;

    if (experience.outcome === 'success') rate += 0.3;
    if (experience.context.novelty > 0.7) rate += 0.2;
    if (experience.context.difficulty > 0.7) rate += 0.1;

    return Math.min(1.0, rate);
  }

  // Utility methods
  private calculateComplexity(input: any): number {
    if (typeof input === 'string') {
      return Math.min(1, input.length / 1000);
    }
    
    if (typeof input === 'object' && input !== null) {
      return Math.min(1, Object.keys(input).length / 20);
    }
    
    return 0.3;
  }

  private calculateSimilarity(input1: any, input2: any): number {
    const str1 = JSON.stringify(input1);
    const str2 = JSON.stringify(input2);
    
    if (str1 === str2) return 1.0;
    
    // Simple Jaccard similarity
    const set1 = new Set(str1.split(' '));
    const set2 = new Set(str2.split(' '));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private findCommonValues(values: string[]): string[] {
    const counts = new Map<string, number>();
    values.forEach(value => {
      counts.set(value, (counts.get(value) || 0) + 1);
    });

    return Array.from(counts.entries())
      .filter(([_, count]) => count >= 2)
      .map(([value, _]) => value);
  }

  private findCommonRanges(values: number[]): string[] {
    const ranges: string[] = [];
    
    const lowValues = values.filter(v => v < 0.3);
    const mediumValues = values.filter(v => v >= 0.3 && v < 0.7);
    const highValues = values.filter(v => v >= 0.7);

    if (lowValues.length >= 2) ranges.push('low');
    if (mediumValues.length >= 2) ranges.push('medium');
    if (highValues.length >= 2) ranges.push('high');

    return ranges;
  }

  private groupByDomain(experiences: LearningExperience[]): Map<string, LearningExperience[]> {
    const groups = new Map<string, LearningExperience[]>();
    
    experiences.forEach(exp => {
      const domain = exp.context.domain;
      if (!groups.has(domain)) {
        groups.set(domain, []);
      }
      groups.get(domain)!.push(exp);
    });

    return groups;
  }

  private checkImprovement(experiences: LearningExperience[]): boolean {
    if (experiences.length < 3) return false;

    const sortedExperiences = experiences.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const recentSuccesses = sortedExperiences.slice(-3).filter(exp => exp.outcome === 'success').length;
    const earlierSuccesses = sortedExperiences.slice(0, -3).filter(exp => exp.outcome === 'success').length;
    const earlierTotal = sortedExperiences.slice(0, -3).length;

    if (earlierTotal === 0) return recentSuccesses >= 2;

    const recentSuccessRate = recentSuccesses / 3;
    const earlierSuccessRate = earlierSuccesses / earlierTotal;

    return recentSuccessRate > earlierSuccessRate + 0.2;
  }

  // Initialization methods
  private initializeMetaKnowledge(): void {
    this.metaKnowledge = {
      strategies: new Map(),
      patterns: new Map(),
      domainExpertise: new Map(),
      learningHistory: [],
      adaptationRules: []
    };
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalExperiences: 0,
      averageLearningRate: 0.5,
      strategyEffectiveness: {},
      domainProgression: {},
      adaptationSuccess: 0.5,
      knowledgeTransfer: 0.3
    };
  }

  private async loadMetaKnowledge(): Promise<void> {
    // In a real implementation, this would load from persistent storage
    this.logger.debug('Loading meta-knowledge from storage...');
  }

  private async initializeLearningStrategies(): Promise<void> {
    const baseStrategies: MetaLearningStrategy[] = [
      {
        id: 'complex-problem-solving',
        name: 'Complex Problem Solving',
        description: 'Strategy for handling high-difficulty tasks',
        effectiveness: 0.7,
        applicability: ['high-difficulty', 'complex-reasoning'],
        parameters: { depth: 'high', breadth: 'medium' },
        usageCount: 0,
        successRate: 0.7,
        lastUsed: new Date()
      },
      {
        id: 'novel-situation-handling',
        name: 'Novel Situation Handling',
        description: 'Strategy for dealing with unfamiliar contexts',
        effectiveness: 0.6,
        applicability: ['high-novelty', 'exploration'],
        parameters: { caution: 'high', exploration: 'high' },
        usageCount: 0,
        successRate: 0.6,
        lastUsed: new Date()
      },
      {
        id: 'experience-transfer',
        name: 'Experience Transfer',
        description: 'Strategy for applying past experiences to new situations',
        effectiveness: 0.8,
        applicability: ['similar-context', 'knowledge-reuse'],
        parameters: { similarity_threshold: 0.6, adaptation_rate: 0.3 },
        usageCount: 0,
        successRate: 0.8,
        lastUsed: new Date()
      }
    ];

    baseStrategies.forEach(strategy => {
      this.metaKnowledge.strategies.set(strategy.id, strategy);
    });
  }

  private startMetaLearningLoop(): void {
    this.learningLoop = setInterval(() => {
      this.performMetaLearningAnalysis();
    }, 30000); // Every 30 seconds
  }

  private performMetaLearningAnalysis(): void {
    // Analyze recent learning patterns
    this.analyzeRecentPatterns();
    
    // Update strategy rankings
    this.updateStrategyRankings();
    
    // Prune old experiences
    this.pruneOldExperiences();
    
    // Emit meta-learning insights
    this.emitMetaLearningInsights();
  }

  private analyzeRecentPatterns(): void {
    const recentExperiences = this.metaKnowledge.learningHistory.slice(-10);
    if (recentExperiences.length < 5) return;

    const successRate = recentExperiences.filter(exp => exp.outcome === 'success').length / recentExperiences.length;
    
    if (successRate > 0.8) {
      this.emit('highPerformancePeriod', { successRate, experienceCount: recentExperiences.length });
    } else if (successRate < 0.3) {
      this.emit('lowPerformancePeriod', { successRate, experienceCount: recentExperiences.length });
    }
  }

  private updateStrategyRankings(): void {
    const strategies = Array.from(this.metaKnowledge.strategies.values());
    strategies.sort((a, b) => b.effectiveness - a.effectiveness);
    
    this.emit('strategyRankingsUpdated', strategies.slice(0, 5));
  }

  private pruneOldExperiences(): void {
    const maxHistorySize = this.config.get('MAX_LEARNING_HISTORY', 1000);
    if (this.metaKnowledge.learningHistory.length > maxHistorySize) {
      this.metaKnowledge.learningHistory = this.metaKnowledge.learningHistory.slice(-maxHistorySize);
    }
  }

  private emitMetaLearningInsights(): void {
    const insights = {
      totalExperiences: this.metrics.totalExperiences,
      averageLearningRate: this.metrics.averageLearningRate,
      topDomains: this.getTopDomains(),
      mostEffectiveStrategies: this.getMostEffectiveStrategies(),
      recentTrends: this.getRecentTrends()
    };

    this.emit('metaLearningInsights', insights);
  }

  private getTopDomains(): Array<{ domain: string; expertise: number }> {
    return Array.from(this.metaKnowledge.domainExpertise.entries())
      .map(([domain, expertise]) => ({ domain, expertise }))
      .sort((a, b) => b.expertise - a.expertise)
      .slice(0, 5);
  }

  private getMostEffectiveStrategies(): MetaLearningStrategy[] {
    return Array.from(this.metaKnowledge.strategies.values())
      .sort((a, b) => b.effectiveness - a.effectiveness)
      .slice(0, 3);
  }

  private getRecentTrends(): any {
    const recentExperiences = this.metaKnowledge.learningHistory.slice(-20);
    const domains = recentExperiences.map(exp => exp.context.domain);
    const domainCounts = new Map<string, number>();
    
    domains.forEach(domain => {
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
    });

    return {
      mostActiveDomain: Array.from(domainCounts.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none',
      averageDifficulty: recentExperiences.reduce((sum, exp) => sum + exp.context.difficulty, 0) / recentExperiences.length,
      successRate: recentExperiences.filter(exp => exp.outcome === 'success').length / recentExperiences.length
    };
  }

  private maintainLearningHistory(): void {
    const maxSize = this.config.get('MAX_LEARNING_HISTORY', 1000);
    if (this.metaKnowledge.learningHistory.length > maxSize) {
      this.metaKnowledge.learningHistory.shift();
    }
  }

  // ID generation methods
  private generateExperienceId(): string {
    return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLessonId(): string {
    return `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePatternId(): string {
    return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public getters
  public getMetaKnowledge(): MetaKnowledge {
    return {
      strategies: new Map(this.metaKnowledge.strategies),
      patterns: new Map(this.metaKnowledge.patterns),
      domainExpertise: new Map(this.metaKnowledge.domainExpertise),
      learningHistory: [...this.metaKnowledge.learningHistory],
      adaptationRules: [...this.metaKnowledge.adaptationRules]
    };
  }

  public getMetrics(): MetaLearningMetrics {
    return { ...this.metrics };
  }

  public getDomainExpertise(domain: string): number {
    return this.metaKnowledge.domainExpertise.get(domain) || 0.1;
  }

  public getStrategy(strategyId: string): MetaLearningStrategy | undefined {
    return this.metaKnowledge.strategies.get(strategyId);
  }

  public getRecentExperiences(count: number = 10): LearningExperience[] {
    return this.metaKnowledge.learningHistory.slice(-count);
  }

  // Shutdown method
  public async shutdown(): Promise<void> {
    this.isActive = false;
    
    if (this.learningLoop) {
      clearInterval(this.learningLoop);
      this.learningLoop = null;
    }
    
    // Save meta-knowledge to persistent storage
    await this.saveMetaKnowledge();
    
    this.removeAllListeners();
    this.logger.info('✅ Meta Learning Engine shutdown complete');
  }

  private async saveMetaKnowledge(): Promise<void> {
    // In a real implementation, this would save to persistent storage
    this.logger.debug('Saving meta-knowledge to storage...');
  }
}