/**
 * Error Localization - Automatic Bug Location and Root Cause Analysis
 * 
 * This module automatically locates errors in code and performs root cause analysis
 * using advanced debugging techniques and AI-powered analysis.
 */

import { EventEmitter } from 'events';
import { Logger } from '@utils/helpers/logger';
import { LLMManager } from '@integration/external-services/llm-integrations/llm-manager';
import { StaticAnalysis, Bug } from '../bug-detection/static-analysis';
import { ASTParser } from '../code-understanding/ast-parser';

export interface ErrorReport {
  id: string;
  timestamp: Date;
  errorType: 'runtime' | 'compile' | 'logic' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stackTrace?: string;
  location: {
    file: string;
    line: number;
    column: number;
    function?: string;
  };
  context: {
    inputs?: any[];
    environment?: Record<string, any>;
    state?: Record<string, any>;
  };
  reproductionSteps?: string[];
}

export interface LocalizationResult {
  errorReport: ErrorReport;
  suspiciousLocations: SuspiciousLocation[];
  rootCause: RootCauseAnalysis;
  relatedBugs: Bug[];
  confidence: number;
  debuggingStrategy: DebuggingStrategy;
}

export interface SuspiciousLocation {
  file: string;
  line: number;
  column: number;
  function?: string;
  suspicionScore: number; // 0-1 scale
  reasoning: string;
  codeSnippet: string;
  suggestedFix?: string;
}

export interface RootCauseAnalysis {
  primaryCause: string;
  contributingFactors: string[];
  errorCategory: 'data-flow' | 'control-flow' | 'state-management' | 'resource-management' | 'logic' | 'integration';
  impactAnalysis: {
    affectedComponents: string[];
    severity: 'localized' | 'module' | 'system' | 'critical';
    userImpact: string;
  };
  timeline?: {
    when: string;
    what: string;
    why: string;
  }[];
}

export interface DebuggingStrategy {
  approach: 'static-analysis' | 'dynamic-analysis' | 'hybrid' | 'ai-guided';
  steps: DebuggingStep[];
  estimatedTime: number; // in minutes
  requiredTools: string[];
  priority: number;
}

export interface DebuggingStep {
  id: string;
  description: string;
  action: 'inspect' | 'trace' | 'test' | 'modify' | 'verify';
  target: string;
  expectedOutcome: string;
  automated: boolean;
}

export class ErrorLocalization extends EventEmitter {
  private logger: Logger;
  private llmManager: LLMManager;
  private staticAnalysis: StaticAnalysis;
  private astParser: ASTParser;
  private errorHistory: Map<string, ErrorReport[]> = new Map();

  constructor(llmManager: LLMManager) {
    super();
    this.logger = Logger.getInstance();
    this.llmManager = llmManager;
    this.staticAnalysis = new StaticAnalysis();
    this.astParser = new ASTParser();
  }

  public async localizeError(
    errorReport: ErrorReport,
    sourceCode: string,
    language: string
  ): Promise<LocalizationResult> {
    try {
      this.logger.info('Starting error localization', {
        errorId: errorReport.id,
        errorType: errorReport.errorType,
        file: errorReport.location.file
      });

      // Store error in history
      this.storeErrorReport(errorReport);

      // Parse the source code
      const parseResult = await this.astParser.parseCode(sourceCode, language);

      // Perform static analysis to find related bugs
      const staticAnalysisResult = await this.staticAnalysis.analyzeCode(sourceCode, language, errorReport.location.file);

      // Find suspicious locations
      const suspiciousLocations = await this.findSuspiciousLocations(
        errorReport,
        sourceCode,
        parseResult,
        staticAnalysisResult.bugs
      );

      // Perform root cause analysis
      const rootCause = await this.performRootCauseAnalysis(
        errorReport,
        suspiciousLocations,
        sourceCode,
        language
      );

      // Generate debugging strategy
      const debuggingStrategy = await this.generateDebuggingStrategy(
        errorReport,
        rootCause,
        suspiciousLocations
      );

      // Calculate overall confidence
      const confidence = this.calculateLocalizationConfidence(
        suspiciousLocations,
        rootCause,
        staticAnalysisResult.bugs
      );

      const result: LocalizationResult = {
        errorReport,
        suspiciousLocations,
        rootCause,
        relatedBugs: staticAnalysisResult.bugs.filter(bug => 
          this.isBugRelatedToError(bug, errorReport)
        ),
        confidence,
        debuggingStrategy
      };

      this.emit('errorLocalized', result);
      return result;

    } catch (error) {
      this.logger.error('Error during error localization:', error);
      throw error;
    }
  }

  private async findSuspiciousLocations(
    errorReport: ErrorReport,
    sourceCode: string,
    parseResult: any,
    bugs: Bug[]
  ): Promise<SuspiciousLocation[]> {
    const suspiciousLocations: SuspiciousLocation[] = [];
    const lines = sourceCode.split('\n');

    // 1. Direct error location (highest suspicion)
    if (errorReport.location.line <= lines.length) {
      suspiciousLocations.push({
        file: errorReport.location.file,
        line: errorReport.location.line,
        column: errorReport.location.column,
        function: errorReport.location.function,
        suspicionScore: 0.9,
        reasoning: 'Direct error location from stack trace',
        codeSnippet: lines[errorReport.location.line - 1] || '',
        suggestedFix: await this.generateQuickFix(errorReport, lines[errorReport.location.line - 1] || '')
      });
    }

    // 2. Related bugs from static analysis
    for (const bug of bugs) {
      if (this.isBugRelatedToError(bug, errorReport)) {
        suspiciousLocations.push({
          file: bug.location.file || errorReport.location.file,
          line: bug.location.line,
          column: bug.location.column,
          suspicionScore: 0.7 * bug.confidence,
          reasoning: `Related ${bug.type}: ${bug.message}`,
          codeSnippet: bug.codeSnippet,
          suggestedFix: bug.fixSuggestion
        });
      }
    }

    // 3. Data flow analysis
    const dataFlowLocations = await this.analyzeDataFlow(errorReport, parseResult, lines);
    suspiciousLocations.push(...dataFlowLocations);

    // 4. Control flow analysis
    const controlFlowLocations = await this.analyzeControlFlow(errorReport, parseResult, lines);
    suspiciousLocations.push(...controlFlowLocations);

    // 5. AI-powered analysis
    const aiLocations = await this.performAIAnalysis(errorReport, sourceCode);
    suspiciousLocations.push(...aiLocations);

    // Sort by suspicion score and remove duplicates
    return this.deduplicateAndSort(suspiciousLocations);
  }

  private async analyzeDataFlow(
    errorReport: ErrorReport,
    parseResult: any,
    lines: string[]
  ): Promise<SuspiciousLocation[]> {
    const locations: SuspiciousLocation[] = [];

    // Simple data flow analysis - track variable assignments and usage
    if (errorReport.errorType === 'runtime' && errorReport.message.includes('undefined')) {
      const variableMatch = errorReport.message.match(/(\w+) is not defined|Cannot read property .* of undefined/);
      if (variableMatch) {
        const variableName = variableMatch[1];
        
        // Find all lines that reference this variable
        lines.forEach((line, index) => {
          if (line.includes(variableName) && index + 1 !== errorReport.location.line) {
            const isAssignment = line.includes('=') && line.indexOf(variableName) < line.indexOf('=');
            const isUsage = !isAssignment;

            locations.push({
              file: errorReport.location.file,
              line: index + 1,
              column: line.indexOf(variableName),
              suspicionScore: isAssignment ? 0.6 : 0.4,
              reasoning: isAssignment ? 
                `Variable '${variableName}' assignment location` : 
                `Variable '${variableName}' usage location`,
              codeSnippet: line,
              suggestedFix: isAssignment ? 
                `Ensure ${variableName} is properly initialized` : 
                `Add null check before using ${variableName}`
            });
          }
        });
      }
    }

    return locations;
  }

  private async analyzeControlFlow(
    errorReport: ErrorReport,
    parseResult: any,
    lines: string[]
  ): Promise<SuspiciousLocation[]> {
    const locations: SuspiciousLocation[] = [];

    // Analyze control flow around the error location
    const errorLine = errorReport.location.line;
    const contextStart = Math.max(0, errorLine - 10);
    const contextEnd = Math.min(lines.length, errorLine + 10);

    for (let i = contextStart; i < contextEnd; i++) {
      const line = lines[i];
      
      // Look for control flow statements that might affect the error
      if (line.includes('if') || line.includes('else') || line.includes('switch')) {
        locations.push({
          file: errorReport.location.file,
          line: i + 1,
          column: 0,
          suspicionScore: 0.5,
          reasoning: 'Control flow statement near error location',
          codeSnippet: line,
          suggestedFix: 'Review condition logic and edge cases'
        });
      }

      // Look for function calls that might throw errors
      if (line.includes('(') && line.includes(')') && !line.includes('if') && !line.includes('for')) {
        const functionMatch = line.match(/(\w+)\s*\(/);
        if (functionMatch) {
          locations.push({
            file: errorReport.location.file,
            line: i + 1,
            column: line.indexOf(functionMatch[0]),
            suspicionScore: 0.4,
            reasoning: `Function call '${functionMatch[1]}' near error location`,
            codeSnippet: line,
            suggestedFix: `Add error handling for ${functionMatch[1]} function call`
          });
        }
      }
    }

    return locations;
  }

  private async performAIAnalysis(
    errorReport: ErrorReport,
    sourceCode: string
  ): Promise<SuspiciousLocation[]> {
    try {
      const prompt = `
Analyze this code error and identify suspicious locations:

Error: ${errorReport.message}
Error Type: ${errorReport.errorType}
Location: Line ${errorReport.location.line}
${errorReport.stackTrace ? `Stack Trace: ${errorReport.stackTrace}` : ''}

Source Code:
${sourceCode}

Please identify the most likely locations where this error originates from, including:
1. The direct cause
2. Contributing factors
3. Related code sections that might be involved

Format your response as a JSON array of suspicious locations with suspicion scores (0-1).
`;

      const response = await this.llmManager.generateCompletion({
        prompt,
        capabilities: ['reasoning', 'code'],
        temperature: 0.3,
        maxTokens: 2048
      });

      // Parse AI response and extract locations
      return this.parseAILocations(response.content, errorReport.location.file);

    } catch (error) {
      this.logger.warn('AI analysis failed, continuing with other methods:', error.message);
      return [];
    }
  }

  private parseAILocations(aiResponse: string, filename: string): SuspiciousLocation[] {
    const locations: SuspiciousLocation[] = [];

    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            if (item.line && item.suspicionScore && item.reasoning) {
              locations.push({
                file: filename,
                line: item.line,
                column: item.column || 0,
                suspicionScore: Math.min(1, Math.max(0, item.suspicionScore)),
                reasoning: `AI Analysis: ${item.reasoning}`,
                codeSnippet: item.codeSnippet || '',
                suggestedFix: item.suggestedFix
              });
            }
          });
        }
      }
    } catch (error) {
      this.logger.warn('Failed to parse AI analysis response:', error.message);
    }

    return locations;
  }

  private async performRootCauseAnalysis(
    errorReport: ErrorReport,
    suspiciousLocations: SuspiciousLocation[],
    sourceCode: string,
    language: string
  ): Promise<RootCauseAnalysis> {
    // Use AI to perform comprehensive root cause analysis
    const prompt = `
Perform a root cause analysis for this error:

Error: ${errorReport.message}
Error Type: ${errorReport.errorType}
Severity: ${errorReport.severity}

Suspicious Locations:
${suspiciousLocations.map(loc => 
  `Line ${loc.line}: ${loc.reasoning} (Score: ${loc.suspicionScore})`
).join('\n')}

Context:
${errorReport.context ? JSON.stringify(errorReport.context, null, 2) : 'No context available'}

Please provide:
1. Primary root cause
2. Contributing factors
3. Error category
4. Impact analysis
5. Timeline of how the error occurred

Be specific and technical in your analysis.
`;

    try {
      const response = await this.llmManager.generateCompletion({
        prompt,
        capabilities: ['reasoning', 'analysis'],
        temperature: 0.2,
        maxTokens: 1024
      });

      return this.parseRootCauseAnalysis(response.content, errorReport, suspiciousLocations);

    } catch (error) {
      this.logger.warn('AI root cause analysis failed, using fallback:', error.message);
      return this.generateFallbackRootCause(errorReport, suspiciousLocations);
    }
  }

  private parseRootCauseAnalysis(
    aiResponse: string,
    errorReport: ErrorReport,
    suspiciousLocations: SuspiciousLocation[]
  ): RootCauseAnalysis {
    // Extract information from AI response
    const primaryCause = this.extractSection(aiResponse, 'primary', 'root cause') || 
                        'Unable to determine primary cause';
    
    const contributingFactors = this.extractListItems(aiResponse, 'contributing') || 
                               ['Multiple factors may be involved'];

    const errorCategory = this.determineErrorCategory(errorReport, aiResponse);
    
    return {
      primaryCause,
      contributingFactors,
      errorCategory,
      impactAnalysis: {
        affectedComponents: this.identifyAffectedComponents(suspiciousLocations),
        severity: this.determineSeverity(errorReport),
        userImpact: this.assessUserImpact(errorReport)
      },
      timeline: this.generateTimeline(errorReport, suspiciousLocations)
    };
  }

  private generateFallbackRootCause(
    errorReport: ErrorReport,
    suspiciousLocations: SuspiciousLocation[]
  ): RootCauseAnalysis {
    let primaryCause = 'Unknown error cause';
    let errorCategory: RootCauseAnalysis['errorCategory'] = 'logic';

    // Simple heuristics based on error type and message
    if (errorReport.message.includes('undefined') || errorReport.message.includes('null')) {
      primaryCause = 'Null or undefined value access';
      errorCategory = 'data-flow';
    } else if (errorReport.message.includes('not a function')) {
      primaryCause = 'Attempting to call a non-function value';
      errorCategory = 'logic';
    } else if (errorReport.message.includes('permission') || errorReport.message.includes('access')) {
      primaryCause = 'Access or permission error';
      errorCategory = 'resource-management';
    }

    return {
      primaryCause,
      contributingFactors: ['Code logic issue', 'Insufficient error handling'],
      errorCategory,
      impactAnalysis: {
        affectedComponents: this.identifyAffectedComponents(suspiciousLocations),
        severity: this.determineSeverity(errorReport),
        userImpact: this.assessUserImpact(errorReport)
      }
    };
  }

  private async generateDebuggingStrategy(
    errorReport: ErrorReport,
    rootCause: RootCauseAnalysis,
    suspiciousLocations: SuspiciousLocation[]
  ): Promise<DebuggingStrategy> {
    const steps: DebuggingStep[] = [];
    let stepId = 1;

    // Step 1: Inspect the primary error location
    steps.push({
      id: `step_${stepId++}`,
      description: 'Inspect the primary error location',
      action: 'inspect',
      target: `Line ${errorReport.location.line} in ${errorReport.location.file}`,
      expectedOutcome: 'Understand the immediate cause of the error',
      automated: true
    });

    // Step 2: Trace data flow for the most suspicious locations
    const topSuspicious = suspiciousLocations.slice(0, 3);
    for (const location of topSuspicious) {
      steps.push({
        id: `step_${stepId++}`,
        description: `Trace data flow at suspicious location`,
        action: 'trace',
        target: `Line ${location.line}: ${location.reasoning}`,
        expectedOutcome: 'Identify how data reaches this point',
        automated: false
      });
    }

    // Step 3: Test with minimal reproduction case
    steps.push({
      id: `step_${stepId++}`,
      description: 'Create minimal reproduction case',
      action: 'test',
      target: 'Isolated test case',
      expectedOutcome: 'Reproduce the error in controlled environment',
      automated: false
    });

    // Step 4: Apply suggested fixes
    if (suspiciousLocations.some(loc => loc.suggestedFix)) {
      steps.push({
        id: `step_${stepId++}`,
        description: 'Apply suggested fixes',
        action: 'modify',
        target: 'Code locations with suggested fixes',
        expectedOutcome: 'Resolve the error',
        automated: true
      });
    }

    // Step 5: Verify the fix
    steps.push({
      id: `step_${stepId++}`,
      description: 'Verify the fix works',
      action: 'verify',
      target: 'Full application with test cases',
      expectedOutcome: 'Confirm error is resolved without side effects',
      automated: false
    });

    return {
      approach: suspiciousLocations.length > 0 ? 'hybrid' : 'static-analysis',
      steps,
      estimatedTime: this.estimateDebuggingTime(errorReport, steps),
      requiredTools: this.identifyRequiredTools(errorReport, rootCause),
      priority: this.calculatePriority(errorReport)
    };
  }

  // Helper methods
  private storeErrorReport(errorReport: ErrorReport): void {
    const fileErrors = this.errorHistory.get(errorReport.location.file) || [];
    fileErrors.push(errorReport);
    this.errorHistory.set(errorReport.location.file, fileErrors);

    // Keep only recent errors (last 100 per file)
    if (fileErrors.length > 100) {
      fileErrors.splice(0, fileErrors.length - 100);
    }
  }

  private isBugRelatedToError(bug: Bug, errorReport: ErrorReport): boolean {
    // Check if bug is near the error location
    const lineDifference = Math.abs(bug.location.line - errorReport.location.line);
    if (lineDifference <= 5) return true;

    // Check if bug type is related to error type
    const relatedTypes: Record<string, BugType[]> = {
      runtime: ['null-pointer-exception', 'undefined-variable', 'type-mismatch'],
      logic: ['logic-error', 'infinite-loop'],
      performance: ['performance-issue']
    };

    return relatedTypes[errorReport.errorType]?.includes(bug.type) || false;
  }

  private async generateQuickFix(errorReport: ErrorReport, codeLine: string): Promise<string> {
    if (errorReport.message.includes('undefined')) {
      return 'Add null/undefined check before accessing the property';
    }
    if (errorReport.message.includes('not a function')) {
      return 'Verify the variable is a function before calling it';
    }
    if (errorReport.message.includes('permission')) {
      return 'Check file/resource permissions and access rights';
    }
    return 'Review the code logic and add appropriate error handling';
  }

  private deduplicateAndSort(locations: SuspiciousLocation[]): SuspiciousLocation[] {
    // Remove duplicates based on line number
    const uniqueLocations = new Map<number, SuspiciousLocation>();
    
    locations.forEach(location => {
      const existing = uniqueLocations.get(location.line);
      if (!existing || location.suspicionScore > existing.suspicionScore) {
        uniqueLocations.set(location.line, location);
      }
    });

    // Sort by suspicion score (highest first)
    return Array.from(uniqueLocations.values())
      .sort((a, b) => b.suspicionScore - a.suspicionScore)
      .slice(0, 10); // Keep top 10
  }

  private calculateLocalizationConfidence(
    suspiciousLocations: SuspiciousLocation[],
    rootCause: RootCauseAnalysis,
    relatedBugs: Bug[]
  ): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on suspicious locations
    if (suspiciousLocations.length > 0) {
      const avgSuspicion = suspiciousLocations.reduce((sum, loc) => sum + loc.suspicionScore, 0) / suspiciousLocations.length;
      confidence += avgSuspicion * 0.3;
    }

    // Increase confidence if we have related bugs
    if (relatedBugs.length > 0) {
      confidence += Math.min(0.2, relatedBugs.length * 0.05);
    }

    // Increase confidence based on root cause analysis quality
    if (rootCause.primaryCause !== 'Unknown error cause') {
      confidence += 0.2;
    }

    return Math.min(1, confidence);
  }

  private extractSection(text: string, ...keywords: string[]): string | null {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (keywords.some(keyword => line.includes(keyword))) {
        // Return the next non-empty line or the rest of the current line
        const content = lines[i].split(':')[1]?.trim();
        if (content) return content;
        
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim()) {
            return lines[j].trim();
          }
        }
      }
    }
    return null;
  }

  private extractListItems(text: string, keyword: string): string[] | null {
    const lines = text.split('\n');
    const items: string[] = [];
    let inSection = false;

    for (const line of lines) {
      if (line.toLowerCase().includes(keyword)) {
        inSection = true;
        continue;
      }
      
      if (inSection) {
        if (line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().match(/^\d+\./)) {
          items.push(line.trim().replace(/^[-•\d.]\s*/, ''));
        } else if (line.trim() === '' || line.match(/^\w+:/)) {
          break;
        }
      }
    }

    return items.length > 0 ? items : null;
  }

  private determineErrorCategory(errorReport: ErrorReport, aiResponse: string): RootCauseAnalysis['errorCategory'] {
    const categories: RootCauseAnalysis['errorCategory'][] = [
      'data-flow', 'control-flow', 'state-management', 'resource-management', 'logic', 'integration'
    ];

    // Check AI response for category mentions
    for (const category of categories) {
      if (aiResponse.toLowerCase().includes(category.replace('-', ' '))) {
        return category;
      }
    }

    // Fallback based on error type
    if (errorReport.message.includes('undefined') || errorReport.message.includes('null')) {
      return 'data-flow';
    }
    if (errorReport.message.includes('permission') || errorReport.message.includes('access')) {
      return 'resource-management';
    }
    
    return 'logic';
  }

  private identifyAffectedComponents(suspiciousLocations: SuspiciousLocation[]): string[] {
    const components = new Set<string>();
    
    suspiciousLocations.forEach(location => {
      if (location.function) {
        components.add(location.function);
      }
      components.add(`${location.file}:${location.line}`);
    });

    return Array.from(components);
  }

  private determineSeverity(errorReport: ErrorReport): RootCauseAnalysis['impactAnalysis']['severity'] {
    switch (errorReport.severity) {
      case 'critical': return 'critical';
      case 'high': return 'system';
      case 'medium': return 'module';
      default: return 'localized';
    }
  }

  private assessUserImpact(errorReport: ErrorReport): string {
    const impacts = {
      critical: 'Application crash or data loss',
      high: 'Feature unavailable or significant malfunction',
      medium: 'Reduced functionality or performance',
      low: 'Minor inconvenience or cosmetic issue'
    };

    return impacts[errorReport.severity] || 'Unknown impact';
  }

  private generateTimeline(errorReport: ErrorReport, suspiciousLocations: SuspiciousLocation[]): RootCauseAnalysis['timeline'] {
    return [
      {
        when: 'Initial execution',
        what: 'Code execution begins',
        why: 'Normal program flow'
      },
      {
        when: 'Error trigger',
        what: `Error occurred at line ${errorReport.location.line}`,
        why: 'Condition that caused the error was met'
      },
      {
        when: 'Error propagation',
        what: 'Error bubbled up through call stack',
        why: 'No error handling caught the exception'
      }
    ];
  }

  private estimateDebuggingTime(errorReport: ErrorReport, steps: DebuggingStep[]): number {
    let baseTime = 30; // 30 minutes base

    // Adjust based on error severity
    switch (errorReport.severity) {
      case 'critical': baseTime += 60; break;
      case 'high': baseTime += 30; break;
      case 'medium': baseTime += 15; break;
    }

    // Add time for each manual step
    const manualSteps = steps.filter(step => !step.automated).length;
    baseTime += manualSteps * 15;

    return baseTime;
  }

  private identifyRequiredTools(errorReport: ErrorReport, rootCause: RootCauseAnalysis): string[] {
    const tools = ['debugger', 'static-analyzer'];

    if (rootCause.errorCategory === 'performance') {
      tools.push('profiler');
    }
    if (rootCause.errorCategory === 'resource-management') {
      tools.push('memory-analyzer');
    }
    if (errorReport.errorType === 'runtime') {
      tools.push('runtime-tracer');
    }

    return tools;
  }

  private calculatePriority(errorReport: ErrorReport): number {
    const severityScores = { critical: 4, high: 3, medium: 2, low: 1 };
    return severityScores[errorReport.severity] || 1;
  }

  public getErrorHistory(filename?: string): ErrorReport[] {
    if (filename) {
      return this.errorHistory.get(filename) || [];
    }
    
    const allErrors: ErrorReport[] = [];
    this.errorHistory.forEach(errors => allErrors.push(...errors));
    return allErrors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public async generateErrorReport(
    error: Error,
    context: any,
    filename: string,
    line?: number
  ): Promise<ErrorReport> {
    return {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      errorType: 'runtime',
      severity: 'medium',
      message: error.message,
      stackTrace: error.stack,
      location: {
        file: filename,
        line: line || this.extractLineFromStack(error.stack),
        column: 0
      },
      context: {
        inputs: context.inputs,
        environment: context.environment,
        state: context.state
      }
    };
  }

  private extractLineFromStack(stackTrace?: string): number {
    if (!stackTrace) return 1;
    
    const match = stackTrace.match(/:(\d+):\d+/);
    return match ? parseInt(match[1]) : 1;
  }
}