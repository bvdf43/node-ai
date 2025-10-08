/**
 * Static Analysis - Code Bug Detection and Quality Analysis
 * 
 * This module performs static analysis to detect bugs, code smells,
 * and quality issues without executing the code.
 */

import { EventEmitter } from 'events';
import { Logger } from '@utils/helpers/logger';
import { ASTParser, ParseResult } from '../code-understanding/ast-parser';

export interface Bug {
  id: string;
  type: BugType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  description: string;
  location: {
    file?: string;
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
  };
  rule: string;
  category: BugCategory;
  confidence: number; // 0-1 scale
  fixSuggestion?: string;
  codeSnippet: string;
  relatedBugs?: string[];
}

export type BugType = 
  | 'null-pointer-exception'
  | 'memory-leak'
  | 'buffer-overflow'
  | 'race-condition'
  | 'deadlock'
  | 'infinite-loop'
  | 'undefined-variable'
  | 'type-mismatch'
  | 'logic-error'
  | 'security-vulnerability'
  | 'performance-issue'
  | 'code-smell'
  | 'unused-code'
  | 'duplicate-code'
  | 'complexity-issue';

export type BugCategory = 
  | 'correctness'
  | 'security'
  | 'performance'
  | 'maintainability'
  | 'reliability'
  | 'style';

export interface AnalysisResult {
  bugs: Bug[];
  metrics: CodeMetrics;
  summary: AnalysisSummary;
  recommendations: string[];
}

export interface CodeMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  technicalDebt: number; // in hours
  duplicateCodePercentage: number;
  testCoverage?: number;
  codeSmellCount: number;
  bugDensity: number; // bugs per 1000 lines
}

export interface AnalysisSummary {
  totalBugs: number;
  criticalBugs: number;
  highSeverityBugs: number;
  mediumSeverityBugs: number;
  lowSeverityBugs: number;
  categoryCounts: Record<BugCategory, number>;
  typeCounts: Record<BugType, number>;
  overallScore: number; // 0-100 scale
}

export class StaticAnalysis extends EventEmitter {
  private logger: Logger;
  private astParser: ASTParser;
  private bugIdCounter: number = 0;

  constructor() {
    super();
    this.logger = Logger.getInstance();
    this.astParser = new ASTParser();
  }

  public async analyzeCode(code: string, language: string, filename?: string): Promise<AnalysisResult> {
    try {
      this.logger.debug('Starting static analysis', { 
        language, 
        filename, 
        codeLength: code.length 
      });

      // Parse the code
      const parseResult = await this.astParser.parseCode(code, language);

      // Detect bugs
      const bugs = await this.detectBugs(code, language, parseResult, filename);

      // Calculate metrics
      const metrics = this.calculateMetrics(code, parseResult, bugs);

      // Generate summary
      const summary = this.generateSummary(bugs, metrics);

      // Generate recommendations
      const recommendations = this.generateRecommendations(bugs, metrics);

      const result: AnalysisResult = {
        bugs,
        metrics,
        summary,
        recommendations
      };

      this.emit('analysisComplete', result);
      return result;

    } catch (error) {
      this.logger.error('Error during static analysis:', error);
      throw error;
    }
  }

  private async detectBugs(
    code: string, 
    language: string, 
    parseResult: ParseResult, 
    filename?: string
  ): Promise<Bug[]> {
    const bugs: Bug[] = [];
    const lines = code.split('\n');

    // Detect different types of bugs based on language
    bugs.push(...this.detectNullPointerExceptions(lines, language));
    bugs.push(...this.detectUndefinedVariables(lines, language, parseResult));
    bugs.push(...this.detectInfiniteLoops(lines, language));
    bugs.push(...this.detectSecurityVulnerabilities(lines, language));
    bugs.push(...this.detectPerformanceIssues(lines, language));
    bugs.push(...this.detectCodeSmells(lines, language, parseResult));
    bugs.push(...this.detectUnusedCode(parseResult));
    bugs.push(...this.detectDuplicateCode(lines));
    bugs.push(...this.detectComplexityIssues(parseResult));
    bugs.push(...this.detectTypeMismatches(lines, language));
    bugs.push(...this.detectLogicErrors(lines, language));

    // Add filename to all bugs
    bugs.forEach(bug => {
      if (filename) {
        bug.location.file = filename;
      }
    });

    return bugs;
  }

  private detectNullPointerExceptions(lines: string[], language: string): Bug[] {
    const bugs: Bug[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // JavaScript/TypeScript null/undefined checks
      if (language === 'javascript' || language === 'typescript') {
        // Detect potential null/undefined access
        const nullAccessPatterns = [
          /(\w+)\.(\w+).*(?!if|&&|\?\.)/,  // obj.prop without null check
          /(\w+)\[.*\].*(?!if|&&)/,        // obj[key] without null check
        ];

        nullAccessPatterns.forEach(pattern => {
          const match = trimmedLine.match(pattern);
          if (match && !trimmedLine.includes('if') && !trimmedLine.includes('&&') && !trimmedLine.includes('?.')) {
            bugs.push(this.createBug({
              type: 'null-pointer-exception',
              severity: 'high',
              message: `Potential null/undefined access: ${match[0]}`,
              description: 'Accessing properties or methods on potentially null/undefined objects can cause runtime errors.',
              location: { line: index + 1, column: line.indexOf(match[0]) },
              rule: 'null-safety',
              category: 'correctness',
              confidence: 0.7,
              fixSuggestion: `Add null check: if (${match[1]}) { ${match[0]} }`,
              codeSnippet: line
            }));
          }
        });
      }

      // Java null pointer checks
      if (language === 'java') {
        if (trimmedLine.includes('.') && !trimmedLine.includes('if') && !trimmedLine.includes('!=') && !trimmedLine.includes('==')) {
          const match = trimmedLine.match(/(\w+)\./);
          if (match) {
            bugs.push(this.createBug({
              type: 'null-pointer-exception',
              severity: 'high',
              message: `Potential NullPointerException: ${match[1]}`,
              description: 'Accessing methods or fields on potentially null objects.',
              location: { line: index + 1, column: line.indexOf(match[0]) },
              rule: 'null-safety',
              category: 'correctness',
              confidence: 0.6,
              fixSuggestion: `Add null check: if (${match[1]} != null) { ... }`,
              codeSnippet: line
            }));
          }
        }
      }
    });

    return bugs;
  }

  private detectUndefinedVariables(lines: string[], language: string, parseResult: ParseResult): Bug[] {
    const bugs: Bug[] = [];
    const declaredVariables = new Set<string>();

    // Extract declared variables from functions
    parseResult.functions.forEach(func => {
      func.parameters.forEach(param => {
        declaredVariables.add(param.name);
      });
    });

    // Simple variable declaration detection
    lines.forEach((line, index) => {
      const declarations = line.match(/(?:var|let|const|int|string|double|float)\s+(\w+)/g);
      if (declarations) {
        declarations.forEach(decl => {
          const varName = decl.split(/\s+/)[1];
          if (varName) {
            declaredVariables.add(varName);
          }
        });
      }

      // Check for usage of undeclared variables
      const usages = line.match(/\b(\w+)\b/g);
      if (usages) {
        usages.forEach(usage => {
          if (!declaredVariables.has(usage) && 
              !this.isKeyword(usage, language) && 
              !this.isBuiltinFunction(usage, language)) {
            bugs.push(this.createBug({
              type: 'undefined-variable',
              severity: 'medium',
              message: `Potentially undefined variable: ${usage}`,
              description: 'Using variables that may not be declared or initialized.',
              location: { line: index + 1, column: line.indexOf(usage) },
              rule: 'variable-declaration',
              category: 'correctness',
              confidence: 0.5,
              fixSuggestion: `Declare variable: let ${usage} = ...`,
              codeSnippet: line
            }));
          }
        });
      }
    });

    return bugs;
  }

  private detectInfiniteLoops(lines: string[], language: string): Bug[] {
    const bugs: Bug[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Detect while(true) without break
      if (trimmedLine.includes('while') && (trimmedLine.includes('true') || trimmedLine.includes('1'))) {
        // Look ahead for break statement
        let hasBreak = false;
        for (let i = index + 1; i < Math.min(index + 10, lines.length); i++) {
          if (lines[i].includes('break') || lines[i].includes('return')) {
            hasBreak = true;
            break;
          }
        }

        if (!hasBreak) {
          bugs.push(this.createBug({
            type: 'infinite-loop',
            severity: 'critical',
            message: 'Potential infinite loop detected',
            description: 'Loop condition is always true without visible break condition.',
            location: { line: index + 1, column: 0 },
            rule: 'infinite-loop-detection',
            category: 'correctness',
            confidence: 0.8,
            fixSuggestion: 'Add break condition or modify loop condition',
            codeSnippet: line
          }));
        }
      }

      // Detect for loops with no increment
      if (trimmedLine.includes('for') && language === 'javascript') {
        const forMatch = trimmedLine.match(/for\s*\(\s*[^;]*;\s*[^;]*;\s*\)/);
        if (forMatch && !trimmedLine.includes('++') && !trimmedLine.includes('--') && !trimmedLine.includes('+=')) {
          bugs.push(this.createBug({
            type: 'infinite-loop',
            severity: 'high',
            message: 'For loop without increment/decrement',
            description: 'For loop may run infinitely without proper increment.',
            location: { line: index + 1, column: 0 },
            rule: 'loop-increment',
            category: 'correctness',
            confidence: 0.7,
            fixSuggestion: 'Add increment/decrement in loop',
            codeSnippet: line
          }));
        }
      }
    });

    return bugs;
  }

  private detectSecurityVulnerabilities(lines: string[], language: string): Bug[] {
    const bugs: Bug[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim().toLowerCase();

      // SQL Injection
      if (trimmedLine.includes('select') && trimmedLine.includes('+')) {
        bugs.push(this.createBug({
          type: 'security-vulnerability',
          severity: 'critical',
          message: 'Potential SQL injection vulnerability',
          description: 'String concatenation in SQL queries can lead to SQL injection.',
          location: { line: index + 1, column: 0 },
          rule: 'sql-injection',
          category: 'security',
          confidence: 0.8,
          fixSuggestion: 'Use parameterized queries or prepared statements',
          codeSnippet: line
        }));
      }

      // XSS vulnerabilities
      if (trimmedLine.includes('innerhtml') && trimmedLine.includes('=')) {
        bugs.push(this.createBug({
          type: 'security-vulnerability',
          severity: 'high',
          message: 'Potential XSS vulnerability',
          description: 'Setting innerHTML with user input can lead to XSS attacks.',
          location: { line: index + 1, column: 0 },
          rule: 'xss-prevention',
          category: 'security',
          confidence: 0.7,
          fixSuggestion: 'Use textContent or sanitize input',
          codeSnippet: line
        }));
      }

      // Hardcoded passwords/secrets
      const secretPatterns = ['password', 'secret', 'key', 'token', 'api_key'];
      secretPatterns.forEach(pattern => {
        if (trimmedLine.includes(pattern) && trimmedLine.includes('=') && trimmedLine.includes('"')) {
          bugs.push(this.createBug({
            type: 'security-vulnerability',
            severity: 'high',
            message: 'Hardcoded secret detected',
            description: 'Hardcoded secrets in source code pose security risks.',
            location: { line: index + 1, column: 0 },
            rule: 'hardcoded-secrets',
            category: 'security',
            confidence: 0.6,
            fixSuggestion: 'Use environment variables or secure configuration',
            codeSnippet: line.replace(/["'][^"']*["']/, '"***"') // Mask the secret
          }));
        }
      });
    });

    return bugs;
  }

  private detectPerformanceIssues(lines: string[], language: string): Bug[] {
    const bugs: Bug[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Inefficient string concatenation
      if (language === 'java' && trimmedLine.includes('+') && trimmedLine.includes('"')) {
        bugs.push(this.createBug({
          type: 'performance-issue',
          severity: 'medium',
          message: 'Inefficient string concatenation',
          description: 'String concatenation in loops can be inefficient in Java.',
          location: { line: index + 1, column: 0 },
          rule: 'string-concatenation',
          category: 'performance',
          confidence: 0.6,
          fixSuggestion: 'Use StringBuilder for multiple concatenations',
          codeSnippet: line
        }));
      }

      // Nested loops
      if (trimmedLine.includes('for') || trimmedLine.includes('while')) {
        // Check if this is inside another loop
        let nestedLevel = 0;
        for (let i = Math.max(0, index - 10); i < index; i++) {
          if (lines[i].includes('for') || lines[i].includes('while')) {
            nestedLevel++;
          }
        }

        if (nestedLevel > 1) {
          bugs.push(this.createBug({
            type: 'performance-issue',
            severity: 'medium',
            message: 'Deeply nested loops detected',
            description: 'Nested loops can cause performance issues with large datasets.',
            location: { line: index + 1, column: 0 },
            rule: 'nested-loops',
            category: 'performance',
            confidence: 0.7,
            fixSuggestion: 'Consider optimizing algorithm or using different data structures',
            codeSnippet: line
          }));
        }
      }
    });

    return bugs;
  }

  private detectCodeSmells(lines: string[], language: string, parseResult: ParseResult): Bug[] {
    const bugs: Bug[] = [];

    // Long functions
    parseResult.functions.forEach(func => {
      const functionLength = func.lineEnd - func.lineStart + 1;
      if (functionLength > 50) {
        bugs.push(this.createBug({
          type: 'code-smell',
          severity: 'low',
          message: `Function '${func.name}' is too long (${functionLength} lines)`,
          description: 'Long functions are harder to understand and maintain.',
          location: { line: func.lineStart, column: 0 },
          rule: 'function-length',
          category: 'maintainability',
          confidence: 0.9,
          fixSuggestion: 'Break down into smaller functions',
          codeSnippet: `function ${func.name}(...) { /* ${functionLength} lines */ }`
        }));
      }
    });

    // Too many parameters
    parseResult.functions.forEach(func => {
      if (func.parameters.length > 5) {
        bugs.push(this.createBug({
          type: 'code-smell',
          severity: 'low',
          message: `Function '${func.name}' has too many parameters (${func.parameters.length})`,
          description: 'Functions with many parameters are hard to use and maintain.',
          location: { line: func.lineStart, column: 0 },
          rule: 'parameter-count',
          category: 'maintainability',
          confidence: 0.8,
          fixSuggestion: 'Use parameter objects or reduce parameter count',
          codeSnippet: `function ${func.name}(${func.parameters.map(p => p.name).join(', ')})`
        }));
      }
    });

    // Magic numbers
    lines.forEach((line, index) => {
      const numbers = line.match(/\b\d{2,}\b/g);
      if (numbers) {
        numbers.forEach(number => {
          if (parseInt(number) > 1 && !line.includes('//') && !line.includes('const')) {
            bugs.push(this.createBug({
              type: 'code-smell',
              severity: 'low',
              message: `Magic number detected: ${number}`,
              description: 'Magic numbers make code harder to understand and maintain.',
              location: { line: index + 1, column: line.indexOf(number) },
              rule: 'magic-numbers',
              category: 'maintainability',
              confidence: 0.6,
              fixSuggestion: `Replace with named constant: const SOME_CONSTANT = ${number}`,
              codeSnippet: line
            }));
          }
        });
      }
    });

    return bugs;
  }

  private detectUnusedCode(parseResult: ParseResult): Bug[] {
    const bugs: Bug[] = [];

    // This is a simplified implementation
    // In a real system, you'd need more sophisticated analysis
    
    const declaredFunctions = new Set(parseResult.functions.map(f => f.name));
    const usedFunctions = new Set<string>();

    // Simple usage detection (would need more sophisticated analysis)
    parseResult.functions.forEach(func => {
      if (func.name === 'main' || func.name === 'init' || func.name.startsWith('test')) {
        usedFunctions.add(func.name);
      }
    });

    declaredFunctions.forEach(funcName => {
      if (!usedFunctions.has(funcName)) {
        const func = parseResult.functions.find(f => f.name === funcName);
        if (func) {
          bugs.push(this.createBug({
            type: 'unused-code',
            severity: 'low',
            message: `Unused function: ${funcName}`,
            description: 'Unused code increases maintenance burden.',
            location: { line: func.lineStart, column: 0 },
            rule: 'unused-code',
            category: 'maintainability',
            confidence: 0.5,
            fixSuggestion: 'Remove unused function or add usage',
            codeSnippet: `function ${funcName}(...)`
          }));
        }
      }
    });

    return bugs;
  }

  private detectDuplicateCode(lines: string[]): Bug[] {
    const bugs: Bug[] = [];
    const lineMap = new Map<string, number[]>();

    // Find duplicate lines
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine.length > 10 && !trimmedLine.startsWith('//')) {
        if (!lineMap.has(trimmedLine)) {
          lineMap.set(trimmedLine, []);
        }
        lineMap.get(trimmedLine)!.push(index + 1);
      }
    });

    // Report duplicates
    lineMap.forEach((lineNumbers, content) => {
      if (lineNumbers.length > 1) {
        bugs.push(this.createBug({
          type: 'duplicate-code',
          severity: 'low',
          message: `Duplicate code found (${lineNumbers.length} occurrences)`,
          description: 'Duplicate code increases maintenance burden and potential for bugs.',
          location: { line: lineNumbers[0], column: 0 },
          rule: 'duplicate-code',
          category: 'maintainability',
          confidence: 0.8,
          fixSuggestion: 'Extract common code into a function',
          codeSnippet: content
        }));
      }
    });

    return bugs;
  }

  private detectComplexityIssues(parseResult: ParseResult): Bug[] {
    const bugs: Bug[] = [];

    parseResult.functions.forEach(func => {
      if (func.complexity > 10) {
        bugs.push(this.createBug({
          type: 'complexity-issue',
          severity: func.complexity > 20 ? 'high' : 'medium',
          message: `High cyclomatic complexity in function '${func.name}' (${func.complexity})`,
          description: 'High complexity makes code harder to understand, test, and maintain.',
          location: { line: func.lineStart, column: 0 },
          rule: 'cyclomatic-complexity',
          category: 'maintainability',
          confidence: 0.9,
          fixSuggestion: 'Break down complex function into smaller functions',
          codeSnippet: `function ${func.name}(...) { /* complexity: ${func.complexity} */ }`
        }));
      }
    });

    return bugs;
  }

  private detectTypeMismatches(lines: string[], language: string): Bug[] {
    const bugs: Bug[] = [];

    if (language === 'typescript' || language === 'java') {
      lines.forEach((line, index) => {
        // Simple type mismatch detection
        if (line.includes('string') && line.includes('number')) {
          bugs.push(this.createBug({
            type: 'type-mismatch',
            severity: 'medium',
            message: 'Potential type mismatch',
            description: 'Mixing string and number types without proper conversion.',
            location: { line: index + 1, column: 0 },
            rule: 'type-safety',
            category: 'correctness',
            confidence: 0.5,
            fixSuggestion: 'Add explicit type conversion',
            codeSnippet: line
          }));
        }
      });
    }

    return bugs;
  }

  private detectLogicErrors(lines: string[], language: string): Bug[] {
    const bugs: Bug[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Assignment in condition
      if (trimmedLine.includes('if') && trimmedLine.includes('=') && !trimmedLine.includes('==') && !trimmedLine.includes('!=')) {
        bugs.push(this.createBug({
          type: 'logic-error',
          severity: 'high',
          message: 'Assignment in condition',
          description: 'Using assignment (=) instead of comparison (==) in condition.',
          location: { line: index + 1, column: 0 },
          rule: 'assignment-in-condition',
          category: 'correctness',
          confidence: 0.8,
          fixSuggestion: 'Use == or === for comparison',
          codeSnippet: line
        }));
      }

      // Unreachable code after return
      if (trimmedLine.includes('return') && index < lines.length - 1) {
        const nextLine = lines[index + 1].trim();
        if (nextLine && !nextLine.startsWith('}') && !nextLine.startsWith('//')) {
          bugs.push(this.createBug({
            type: 'logic-error',
            severity: 'medium',
            message: 'Unreachable code after return',
            description: 'Code after return statement will never be executed.',
            location: { line: index + 2, column: 0 },
            rule: 'unreachable-code',
            category: 'correctness',
            confidence: 0.9,
            fixSuggestion: 'Remove unreachable code or restructure logic',
            codeSnippet: nextLine
          }));
        }
      }
    });

    return bugs;
  }

  private calculateMetrics(code: string, parseResult: ParseResult, bugs: Bug[]): CodeMetrics {
    const lines = code.split('\n');
    const linesOfCode = lines.filter(line => line.trim().length > 0 && !line.trim().startsWith('//')).length;

    return {
      linesOfCode,
      cyclomaticComplexity: parseResult.complexity,
      maintainabilityIndex: this.calculateMaintainabilityIndex(parseResult, bugs),
      technicalDebt: this.calculateTechnicalDebt(bugs),
      duplicateCodePercentage: this.calculateDuplicateCodePercentage(bugs, linesOfCode),
      codeSmellCount: bugs.filter(bug => bug.type === 'code-smell').length,
      bugDensity: (bugs.length / linesOfCode) * 1000 // bugs per 1000 lines
    };
  }

  private calculateMaintainabilityIndex(parseResult: ParseResult, bugs: Bug[]): number {
    let index = 100;
    
    // Reduce based on complexity
    index -= parseResult.complexity * 2;
    
    // Reduce based on bugs
    bugs.forEach(bug => {
      switch (bug.severity) {
        case 'critical': index -= 10; break;
        case 'high': index -= 5; break;
        case 'medium': index -= 2; break;
        case 'low': index -= 1; break;
      }
    });

    return Math.max(0, Math.min(100, index));
  }

  private calculateTechnicalDebt(bugs: Bug[]): number {
    let debt = 0;
    
    bugs.forEach(bug => {
      switch (bug.severity) {
        case 'critical': debt += 4; break;
        case 'high': debt += 2; break;
        case 'medium': debt += 1; break;
        case 'low': debt += 0.5; break;
      }
    });

    return debt;
  }

  private calculateDuplicateCodePercentage(bugs: Bug[], linesOfCode: number): number {
    const duplicateBugs = bugs.filter(bug => bug.type === 'duplicate-code');
    return linesOfCode > 0 ? (duplicateBugs.length / linesOfCode) * 100 : 0;
  }

  private generateSummary(bugs: Bug[], metrics: CodeMetrics): AnalysisSummary {
    const categoryCounts: Record<BugCategory, number> = {
      correctness: 0,
      security: 0,
      performance: 0,
      maintainability: 0,
      reliability: 0,
      style: 0
    };

    const typeCounts: Record<BugType, number> = {} as Record<BugType, number>;

    let criticalBugs = 0;
    let highSeverityBugs = 0;
    let mediumSeverityBugs = 0;
    let lowSeverityBugs = 0;

    bugs.forEach(bug => {
      categoryCounts[bug.category]++;
      typeCounts[bug.type] = (typeCounts[bug.type] || 0) + 1;

      switch (bug.severity) {
        case 'critical': criticalBugs++; break;
        case 'high': highSeverityBugs++; break;
        case 'medium': mediumSeverityBugs++; break;
        case 'low': lowSeverityBugs++; break;
      }
    });

    const overallScore = Math.max(0, 100 - (criticalBugs * 20 + highSeverityBugs * 10 + mediumSeverityBugs * 5 + lowSeverityBugs * 1));

    return {
      totalBugs: bugs.length,
      criticalBugs,
      highSeverityBugs,
      mediumSeverityBugs,
      lowSeverityBugs,
      categoryCounts,
      typeCounts,
      overallScore
    };
  }

  private generateRecommendations(bugs: Bug[], metrics: CodeMetrics): string[] {
    const recommendations: string[] = [];

    if (bugs.filter(b => b.severity === 'critical').length > 0) {
      recommendations.push('Address critical bugs immediately - they pose significant risks');
    }

    if (bugs.filter(b => b.category === 'security').length > 0) {
      recommendations.push('Review and fix security vulnerabilities to prevent attacks');
    }

    if (metrics.cyclomaticComplexity > 20) {
      recommendations.push('Reduce code complexity by breaking down large functions');
    }

    if (metrics.duplicateCodePercentage > 10) {
      recommendations.push('Refactor duplicate code to improve maintainability');
    }

    if (metrics.maintainabilityIndex < 50) {
      recommendations.push('Improve code maintainability through refactoring and cleanup');
    }

    if (bugs.filter(b => b.type === 'performance-issue').length > 0) {
      recommendations.push('Optimize performance bottlenecks identified in the analysis');
    }

    if (recommendations.length === 0) {
      recommendations.push('Code quality is good - continue following best practices');
    }

    return recommendations;
  }

  private createBug(bugData: Omit<Bug, 'id'>): Bug {
    return {
      id: `bug_${++this.bugIdCounter}`,
      ...bugData
    };
  }

  private isKeyword(word: string, language: string): boolean {
    const keywords: Record<string, string[]> = {
      javascript: ['var', 'let', 'const', 'function', 'if', 'else', 'for', 'while', 'return', 'true', 'false', 'null', 'undefined'],
      typescript: ['var', 'let', 'const', 'function', 'if', 'else', 'for', 'while', 'return', 'true', 'false', 'null', 'undefined', 'interface', 'type'],
      python: ['def', 'if', 'else', 'for', 'while', 'return', 'True', 'False', 'None', 'class', 'import'],
      java: ['public', 'private', 'protected', 'class', 'interface', 'if', 'else', 'for', 'while', 'return', 'true', 'false', 'null']
    };

    return keywords[language]?.includes(word) || false;
  }

  private isBuiltinFunction(word: string, language: string): boolean {
    const builtins: Record<string, string[]> = {
      javascript: ['console', 'parseInt', 'parseFloat', 'isNaN', 'setTimeout', 'setInterval'],
      python: ['print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict'],
      java: ['System', 'String', 'Integer', 'Double', 'Math']
    };

    return builtins[language]?.includes(word) || false;
  }

  public async analyzeBatch(files: Array<{ code: string; language: string; filename: string }>): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];

    for (const file of files) {
      try {
        const result = await this.analyzeCode(file.code, file.language, file.filename);
        results.push(result);
      } catch (error) {
        this.logger.error(`Error analyzing file ${file.filename}:`, error);
      }
    }

    return results;
  }

  public getSupportedLanguages(): string[] {
    return this.astParser.getSupportedLanguages();
  }
}