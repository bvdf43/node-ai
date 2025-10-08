/**
 * AST Parser - Abstract Syntax Tree Analysis
 * 
 * This module parses code into Abstract Syntax Trees for analysis and understanding.
 */

import { EventEmitter } from 'events';
import { Logger } from '@utils/helpers/logger';

export interface ASTNode {
  type: string;
  value?: any;
  children: ASTNode[];
  position: {
    line: number;
    column: number;
  };
  metadata: Record<string, any>;
}

export interface ParseResult {
  ast: ASTNode;
  language: string;
  complexity: number;
  functions: FunctionInfo[];
  classes: ClassInfo[];
  imports: ImportInfo[];
  errors: ParseError[];
}

export interface FunctionInfo {
  name: string;
  parameters: ParameterInfo[];
  returnType?: string;
  complexity: number;
  lineStart: number;
  lineEnd: number;
}

export interface ClassInfo {
  name: string;
  methods: FunctionInfo[];
  properties: PropertyInfo[];
  inheritance: string[];
  lineStart: number;
  lineEnd: number;
}

export interface ParameterInfo {
  name: string;
  type?: string;
  defaultValue?: any;
  isOptional: boolean;
}

export interface PropertyInfo {
  name: string;
  type?: string;
  visibility: 'public' | 'private' | 'protected';
  isStatic: boolean;
}

export interface ImportInfo {
  module: string;
  imports: string[];
  isDefault: boolean;
  alias?: string;
}

export interface ParseError {
  message: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
}

export class ASTParser extends EventEmitter {
  private logger: Logger;

  constructor() {
    super();
    this.logger = Logger.getInstance();
  }

  public async parseCode(code: string, language: string): Promise<ParseResult> {
    try {
      this.logger.debug('Parsing code', { language, codeLength: code.length });

      // Simple parsing logic - in a real implementation, this would use
      // language-specific parsers like @babel/parser for JavaScript,
      // tree-sitter for multiple languages, etc.
      
      const ast = this.createSimpleAST(code, language);
      const functions = this.extractFunctions(code, language);
      const classes = this.extractClasses(code, language);
      const imports = this.extractImports(code, language);
      const complexity = this.calculateComplexity(code);
      const errors = this.validateSyntax(code, language);

      const result: ParseResult = {
        ast,
        language,
        complexity,
        functions,
        classes,
        imports,
        errors
      };

      this.emit('codeParsed', result);
      return result;

    } catch (error) {
      this.logger.error('Error parsing code:', error);
      throw error;
    }
  }

  private createSimpleAST(code: string, language: string): ASTNode {
    // Simplified AST creation
    const lines = code.split('\n');
    
    return {
      type: 'Program',
      children: lines.map((line, index) => ({
        type: 'Statement',
        value: line,
        children: [],
        position: { line: index + 1, column: 0 },
        metadata: { language }
      })),
      position: { line: 1, column: 0 },
      metadata: { language, totalLines: lines.length }
    };
  }

  private extractFunctions(code: string, language: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    const lines = code.split('\n');

    // Simple function extraction patterns
    const patterns: Record<string, RegExp> = {
      javascript: /function\s+(\w+)\s*\(([^)]*)\)/g,
      typescript: /(?:function\s+(\w+)|(\w+)\s*:\s*\([^)]*\)\s*=>|(\w+)\s*\([^)]*\))/g,
      python: /def\s+(\w+)\s*\(([^)]*)\)/g,
      java: /(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(([^)]*)\)/g,
      csharp: /(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(([^)]*)\)/g
    };

    const pattern = patterns[language.toLowerCase()];
    if (!pattern) return functions;

    lines.forEach((line, index) => {
      const matches = line.matchAll(pattern);
      for (const match of matches) {
        const functionName = match[1] || match[2] || match[3];
        const parameters = this.parseParameters(match[2] || '', language);
        
        if (functionName) {
          functions.push({
            name: functionName,
            parameters,
            complexity: this.calculateFunctionComplexity(line),
            lineStart: index + 1,
            lineEnd: index + 1 // Simplified - would need proper parsing for actual end
          });
        }
      }
    });

    return functions;
  }

  private extractClasses(code: string, language: string): ClassInfo[] {
    const classes: ClassInfo[] = [];
    const lines = code.split('\n');

    const patterns: Record<string, RegExp> = {
      javascript: /class\s+(\w+)(?:\s+extends\s+(\w+))?/g,
      typescript: /class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/g,
      python: /class\s+(\w+)(?:\(([^)]+)\))?/g,
      java: /(?:public|private|protected)?\s*class\s+(\w+)(?:\s+extends\s+(\w+))?/g,
      csharp: /(?:public|private|protected)?\s*class\s+(\w+)(?:\s*:\s*([^{]+))?/g
    };

    const pattern = patterns[language.toLowerCase()];
    if (!pattern) return classes;

    lines.forEach((line, index) => {
      const matches = line.matchAll(pattern);
      for (const match of matches) {
        const className = match[1];
        const inheritance = match[2] ? [match[2]] : [];
        
        if (className) {
          classes.push({
            name: className,
            methods: [], // Would need deeper parsing
            properties: [], // Would need deeper parsing
            inheritance,
            lineStart: index + 1,
            lineEnd: index + 1 // Simplified
          });
        }
      }
    });

    return classes;
  }

  private extractImports(code: string, language: string): ImportInfo[] {
    const imports: ImportInfo[] = [];
    const lines = code.split('\n');

    const patterns: Record<string, RegExp> = {
      javascript: /import\s+(?:(\w+)|{([^}]+)})\s+from\s+['"]([^'"]+)['"]/g,
      typescript: /import\s+(?:(\w+)|{([^}]+)})\s+from\s+['"]([^'"]+)['"]/g,
      python: /(?:from\s+(\w+)\s+)?import\s+([^#\n]+)/g,
      java: /import\s+([^;]+);/g,
      csharp: /using\s+([^;]+);/g
    };

    const pattern = patterns[language.toLowerCase()];
    if (!pattern) return imports;

    lines.forEach(line => {
      const matches = line.matchAll(pattern);
      for (const match of matches) {
        if (language.toLowerCase() === 'javascript' || language.toLowerCase() === 'typescript') {
          const defaultImport = match[1];
          const namedImports = match[2];
          const module = match[3];
          
          imports.push({
            module,
            imports: defaultImport ? [defaultImport] : (namedImports ? namedImports.split(',').map(s => s.trim()) : []),
            isDefault: !!defaultImport
          });
        } else if (language.toLowerCase() === 'python') {
          const module = match[1] || 'builtin';
          const importedItems = match[2].split(',').map(s => s.trim());
          
          imports.push({
            module,
            imports: importedItems,
            isDefault: false
          });
        } else {
          const module = match[1];
          imports.push({
            module,
            imports: [module],
            isDefault: false
          });
        }
      }
    });

    return imports;
  }

  private parseParameters(paramString: string, language: string): ParameterInfo[] {
    if (!paramString.trim()) return [];

    const params = paramString.split(',').map(p => p.trim());
    
    return params.map(param => {
      // Simple parameter parsing
      const parts = param.split(/[=:]/);
      const name = parts[0].trim();
      const hasDefault = param.includes('=');
      const hasType = param.includes(':') && (language === 'typescript' || language === 'python');
      
      return {
        name,
        type: hasType ? parts[1]?.trim() : undefined,
        defaultValue: hasDefault ? parts[parts.length - 1]?.trim() : undefined,
        isOptional: hasDefault || param.includes('?')
      };
    });
  }

  private calculateComplexity(code: string): number {
    // Simple cyclomatic complexity calculation
    let complexity = 1; // Base complexity
    
    // Count decision points
    const decisionKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||', '?'];
    
    decisionKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = code.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  private calculateFunctionComplexity(functionCode: string): number {
    return this.calculateComplexity(functionCode);
  }

  private validateSyntax(code: string, language: string): ParseError[] {
    const errors: ParseError[] = [];
    const lines = code.split('\n');

    // Simple syntax validation
    lines.forEach((line, index) => {
      // Check for common syntax errors
      if (language.toLowerCase() === 'javascript' || language.toLowerCase() === 'typescript') {
        // Check for unmatched brackets
        const openBrackets = (line.match(/[{[(]/g) || []).length;
        const closeBrackets = (line.match(/[}\])]/g) || []).length;
        
        if (openBrackets !== closeBrackets) {
          errors.push({
            message: 'Unmatched brackets',
            line: index + 1,
            column: 0,
            severity: 'warning'
          });
        }

        // Check for missing semicolons (simplified)
        if (line.trim().length > 0 && 
            !line.trim().endsWith(';') && 
            !line.trim().endsWith('{') && 
            !line.trim().endsWith('}') &&
            !line.trim().startsWith('//') &&
            !line.includes('if') &&
            !line.includes('for') &&
            !line.includes('while')) {
          errors.push({
            message: 'Missing semicolon',
            line: index + 1,
            column: line.length,
            severity: 'warning'
          });
        }
      }

      if (language.toLowerCase() === 'python') {
        // Check indentation (simplified)
        const leadingSpaces = line.match(/^ */)?.[0].length || 0;
        if (leadingSpaces % 4 !== 0 && line.trim().length > 0) {
          errors.push({
            message: 'Inconsistent indentation',
            line: index + 1,
            column: 0,
            severity: 'warning'
          });
        }
      }
    });

    return errors;
  }

  public async analyzeCodeStructure(code: string, language: string): Promise<any> {
    const parseResult = await this.parseCode(code, language);
    
    return {
      overview: {
        language,
        totalLines: code.split('\n').length,
        complexity: parseResult.complexity,
        functionCount: parseResult.functions.length,
        classCount: parseResult.classes.length,
        importCount: parseResult.imports.length,
        errorCount: parseResult.errors.length
      },
      structure: {
        functions: parseResult.functions,
        classes: parseResult.classes,
        imports: parseResult.imports
      },
      quality: {
        errors: parseResult.errors,
        complexity: parseResult.complexity,
        maintainabilityIndex: this.calculateMaintainabilityIndex(parseResult)
      }
    };
  }

  private calculateMaintainabilityIndex(parseResult: ParseResult): number {
    // Simplified maintainability index calculation
    let index = 100; // Start with perfect score

    // Reduce score based on complexity
    index -= parseResult.complexity * 2;

    // Reduce score based on errors
    index -= parseResult.errors.length * 5;

    // Reduce score based on function count (too many functions can be hard to maintain)
    if (parseResult.functions.length > 20) {
      index -= (parseResult.functions.length - 20) * 1;
    }

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, index));
  }

  public getSupportedLanguages(): string[] {
    return [
      'javascript',
      'typescript',
      'python',
      'java',
      'csharp',
      'cpp',
      'c',
      'go',
      'rust',
      'php',
      'ruby'
    ];
  }
}