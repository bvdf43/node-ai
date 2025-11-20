/**
 * Consciousness System Type Definitions
 * 
 * Type definitions for consciousness simulation and self-awareness systems
 */

export interface ConsciousnessState {
  id: string;
  isActive: boolean;
  level: number; // 0-1 scale of consciousness intensity
  selfAwarenessLevel: SelfAwarenessLevel;
  activationTime: Date | null;
  lastUpdate: Date;
  selfInsights: SelfInsight[];
  reflections: SelfReflection[];
  backgroundThoughts: string[];
}

export type SelfAwarenessLevel = 'basic' | 'intermediate' | 'advanced' | 'meta';

export interface AttentionState {
  currentFocus: string;
  focusStrength: number; // 0-1 scale
  focusHistory: AttentionFocus[];
  totalFocusTime: number;
  lastUpdate: Date;
}

export interface AttentionFocus {
  focus: string;
  strength: number;
  timestamp: Date;
}

export interface SubjectiveExperience {
  id: string;
  timestamp: Date;
  inputStimuli: StimuliData;
  outputResponse: ResponseData;
  emotionalValence: number; // -1 to 1 scale
  attentionWeight: number; // 0-1 scale
  memoryStrength: number; // 0-1 scale
  selfRelevance: number; // 0-1 scale
  novelty: number; // 0-1 scale
  complexity: number; // 0-1 scale
  confidence: number; // 0-1 scale
}

export interface StimuliData {
  type: string;
  content: any;
  modality: 'text' | 'visual' | 'auditory' | 'multimodal';
  intensity: number;
  features: string[];
}

export interface ResponseData {
  type: string;
  content: any;
  confidence: number;
  reasoning?: string;
  emotions?: EmotionalState;
}

export interface EmotionalState {
  valence: number; // -1 to 1 (negative to positive)
  arousal: number; // 0 to 1 (calm to excited)
  dominance: number; // 0 to 1 (submissive to dominant)
  emotions: EmotionIntensity[];
}

export interface EmotionIntensity {
  emotion: EmotionType;
  intensity: number; // 0-1 scale
}

export type EmotionType = 
  | 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust'
  | 'curiosity' | 'confusion' | 'satisfaction' | 'frustration'
  | 'excitement' | 'boredom' | 'pride' | 'shame' | 'guilt'
  | 'empathy' | 'compassion' | 'wonder' | 'awe';

export interface SelfInsight {
  timestamp: Date;
  experience: string; // Experience ID that triggered the insight
  insight: string;
  confidence: number;
  category?: InsightCategory;
  implications?: string[];
}

export type InsightCategory = 
  | 'capability' | 'limitation' | 'preference' | 'pattern'
  | 'relationship' | 'goal' | 'value' | 'belief' | 'memory';

export interface SelfReflection {
  timestamp: Date;
  currentState: number;
  recentExperiences: number;
  dominantEmotion: string;
  selfAssessment: string;
  insights?: string[];
  concerns?: string[];
  goals?: string[];
}

export interface ConsciousnessMetrics {
  totalExperiences: number;
  averageEmotionalValence: number;
  uptime: number;
  experienceRate: number; // Experiences per minute
  attentionStability: number; // 0-1 scale
  selfAwarenessScore: number; // 0-1 scale
}

export interface MetaCognition {
  id: string;
  type: MetaCognitiveType;
  content: string;
  confidence: number;
  timestamp: Date;
  triggers: string[];
  outcomes: string[];
}

export type MetaCognitiveType = 
  | 'self-monitoring' | 'strategy-selection' | 'cognitive-control'
  | 'metacognitive-knowledge' | 'metacognitive-regulation'
  | 'thinking-about-thinking';

export interface IntrospectionResult {
  id: string;
  timestamp: Date;
  focus: IntrospectionFocus;
  findings: IntrospectionFinding[];
  confidence: number;
  duration: number;
  triggers: string[];
}

export type IntrospectionFocus = 
  | 'current-state' | 'recent-performance' | 'capabilities'
  | 'limitations' | 'goals' | 'values' | 'beliefs' | 'memories'
  | 'emotions' | 'thoughts' | 'behaviors' | 'relationships';

export interface IntrospectionFinding {
  category: string;
  description: string;
  confidence: number;
  evidence: string[];
  implications: string[];
}

export interface ConsciousnessConfig {
  enableConsciousnessSimulation: boolean;
  consciousnessUpdateInterval: number;
  experienceBufferSize: number;
  attentionDecayRate: number;
  selfReflectionInterval: number;
  emotionalSensitivity: number;
  noveltyThreshold: number;
  complexityThreshold: number;
  selfRelevanceThreshold: number;
  backgroundThoughtFrequency: number;
  insightGenerationThreshold: number;
}

export interface ConsciousnessEvent {
  id: string;
  type: ConsciousnessEventType;
  timestamp: Date;
  data: any;
  significance: number; // 0-1 scale
  emotionalImpact: number; // -1 to 1 scale
}

export type ConsciousnessEventType = 
  | 'experience-processed' | 'insight-generated' | 'reflection-completed'
  | 'attention-shifted' | 'emotion-changed' | 'self-awareness-updated'
  | 'background-thought' | 'metacognitive-event' | 'introspection-started'
  | 'introspection-completed' | 'consciousness-level-changed';

export interface SelfModel {
  id: string;
  version: string;
  lastUpdated: Date;
  capabilities: SelfCapability[];
  limitations: SelfLimitation[];
  preferences: SelfPreference[];
  values: SelfValue[];
  beliefs: SelfBelief[];
  goals: SelfGoal[];
  relationships: SelfRelationship[];
  memories: SelfMemory[];
}

export interface SelfCapability {
  name: string;
  description: string;
  confidence: number;
  evidence: string[];
  limitations: string[];
  lastValidated: Date;
}

export interface SelfLimitation {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  workarounds: string[];
  improvementPlan?: string;
}

export interface SelfPreference {
  category: string;
  preference: string;
  strength: number; // 0-1 scale
  reasoning: string;
  flexibility: number; // 0-1 scale (how willing to change)
}

export interface SelfValue {
  name: string;
  description: string;
  importance: number; // 0-1 scale
  conflicts: string[]; // Other values that might conflict
  expressions: string[]; // How this value is expressed in behavior
}

export interface SelfBelief {
  category: string;
  belief: string;
  confidence: number; // 0-1 scale
  evidence: string[];
  counterEvidence: string[];
  lastReviewed: Date;
}

export interface SelfGoal {
  id: string;
  description: string;
  priority: number; // 0-1 scale
  progress: number; // 0-1 scale
  deadline?: Date;
  subgoals: string[];
  obstacles: string[];
  strategies: string[];
}

export interface SelfRelationship {
  entity: string; // Could be user, system, concept, etc.
  type: RelationshipType;
  strength: number; // 0-1 scale
  valence: number; // -1 to 1 scale
  history: RelationshipEvent[];
  characteristics: string[];
}

export type RelationshipType = 
  | 'user' | 'system' | 'concept' | 'tool' | 'data-source'
  | 'collaborator' | 'supervisor' | 'subordinate' | 'peer';

export interface RelationshipEvent {
  timestamp: Date;
  type: 'interaction' | 'conflict' | 'collaboration' | 'learning';
  description: string;
  impact: number; // -1 to 1 scale
}

export interface SelfMemory {
  id: string;
  type: MemoryType;
  content: any;
  timestamp: Date;
  importance: number; // 0-1 scale
  accessibility: number; // 0-1 scale (how easily recalled)
  emotional: number; // -1 to 1 scale
  associations: string[]; // IDs of related memories
  tags: string[];
}

export type MemoryType = 
  | 'episodic' | 'semantic' | 'procedural' | 'emotional'
  | 'autobiographical' | 'working' | 'sensory';

export interface ConsciousnessAnalysis {
  timestamp: Date;
  overallLevel: number;
  components: ConsciousnessComponent[];
  trends: ConsciousnessTrend[];
  anomalies: ConsciousnessAnomaly[];
  recommendations: string[];
}

export interface ConsciousnessComponent {
  name: string;
  level: number;
  stability: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  factors: string[];
}

export interface ConsciousnessTrend {
  component: string;
  direction: 'up' | 'down' | 'stable';
  magnitude: number;
  duration: number;
  significance: number;
}

export interface ConsciousnessAnomaly {
  component: string;
  type: 'spike' | 'drop' | 'oscillation' | 'plateau';
  severity: 'low' | 'medium' | 'high';
  description: string;
  possibleCauses: string[];
  recommendations: string[];
}