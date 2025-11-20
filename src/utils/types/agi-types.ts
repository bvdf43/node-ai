/**
 * AGI System Type Definitions
 * 
 * Core type definitions for the Advanced AGI System
 */

export interface SystemState {
  id: string;
  status: 'initializing' | 'operational' | 'error' | 'shutdown';
  startTime: Date;
  lastActivity: Date;
  lastHealthCheck: Date;
  version: string;
  metrics: SystemMetrics;
}

export interface SystemMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  activeConnections: number;
}

export interface AGICapability {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  confidence: number;
  lastUpdated: Date;
  dependencies?: string[];
  metrics?: CapabilityMetrics;
}

export interface CapabilityMetrics {
  successRate: number;
  averageResponseTime: number;
  totalInvocations: number;
  errorCount: number;
  lastError?: Error;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'active' | 'completed' | 'failed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
  deadline?: Date;
  progress: number;
  subGoals?: Goal[];
  dependencies?: string[];
  metrics?: GoalMetrics;
}

export interface GoalMetrics {
  timeSpent: number;
  resourcesUsed: number;
  milestones: Milestone[];
  blockers: Blocker[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  completedAt?: Date;
  progress: number;
}

export interface Blocker {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

export interface Decision {
  id: string;
  strategy: string;
  confidence: number;
  reasoning: string[];
  alternatives: Alternative[];
  timestamp: Date;
  context: any;
  expectedOutcome: string;
  actualOutcome?: string;
}

export interface Alternative {
  strategy: string;
  confidence: number;
  reasoning: string;
  estimatedCost: number;
  estimatedBenefit: number;
}

export interface LearningExperience {
  id: string;
  input: any;
  output: any;
  feedback?: Feedback;
  timestamp: Date;
  context: LearningContext;
  outcome: 'success' | 'failure' | 'partial';
  lessons: Lesson[];
}

export interface Feedback {
  type: 'positive' | 'negative' | 'neutral';
  score: number;
  comments?: string;
  source: string;
  timestamp: Date;
}

export interface LearningContext {
  domain: string;
  difficulty: number;
  novelty: number;
  importance: number;
  relatedExperiences: string[];
}

export interface Lesson {
  id: string;
  description: string;
  confidence: number;
  applicability: string[];
  evidence: Evidence[];
}

export interface Evidence {
  type: 'empirical' | 'theoretical' | 'observational';
  strength: number;
  description: string;
  source: string;
}

export interface CognitiveProcess {
  id: string;
  name: string;
  type: 'perception' | 'attention' | 'memory' | 'reasoning' | 'decision' | 'action';
  status: 'idle' | 'active' | 'blocked' | 'error';
  priority: number;
  resources: ResourceUsage;
  dependencies: string[];
  outputs: string[];
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  bandwidth: number;
  storage: number;
  gpu?: number;
}

export interface NeuralNetworkConfig {
  architecture: string;
  layers: LayerConfig[];
  optimizer: OptimizerConfig;
  lossFunction: string;
  metrics: string[];
  hyperparameters: HyperParameters;
}

export interface LayerConfig {
  type: string;
  units?: number;
  activation?: string;
  dropout?: number;
  regularization?: RegularizationConfig;
}

export interface RegularizationConfig {
  type: 'l1' | 'l2' | 'dropout' | 'batch_norm';
  value: number;
}

export interface OptimizerConfig {
  type: 'adam' | 'sgd' | 'rmsprop' | 'adagrad';
  learningRate: number;
  momentum?: number;
  decay?: number;
}

export interface HyperParameters {
  batchSize: number;
  epochs: number;
  validationSplit: number;
  earlyStoppingPatience?: number;
  learningRateSchedule?: LearningRateSchedule;
}

export interface LearningRateSchedule {
  type: 'exponential' | 'step' | 'cosine' | 'polynomial';
  initialRate: number;
  decayRate: number;
  decaySteps: number;
}

export interface QuantumState {
  qubits: number;
  amplitudes: Complex[];
  entanglements: EntanglementPair[];
  measurements: QuantumMeasurement[];
}

export interface Complex {
  real: number;
  imaginary: number;
}

export interface EntanglementPair {
  qubit1: number;
  qubit2: number;
  strength: number;
}

export interface QuantumMeasurement {
  qubit: number;
  result: 0 | 1;
  probability: number;
  timestamp: Date;
}

export interface AgentCommunication {
  id: string;
  senderId: string;
  receiverId: string;
  messageType: 'request' | 'response' | 'broadcast' | 'negotiation';
  content: any;
  timestamp: Date;
  priority: number;
  requiresResponse: boolean;
  responseTimeout?: number;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  metadata: GraphMetadata;
}

export interface KnowledgeNode {
  id: string;
  type: string;
  label: string;
  properties: Record<string, any>;
  confidence: number;
  source: string;
  timestamp: Date;
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
  properties: Record<string, any>;
  confidence: number;
}

export interface GraphMetadata {
  version: string;
  createdAt: Date;
  updatedAt: Date;
  nodeCount: number;
  edgeCount: number;
  domains: string[];
}

export interface SecurityContext {
  userId?: string;
  permissions: Permission[];
  securityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  accessToken?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface Permission {
  resource: string;
  action: string;
  granted: boolean;
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  type: 'time' | 'location' | 'rate' | 'context';
  value: any;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'contains';
}

export interface APIRequest {
  id: string;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  securityContext: SecurityContext;
}

export interface APIResponse {
  id: string;
  requestId: string;
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  timestamp: Date;
  processingTime: number;
  errors?: APIError[];
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
  timestamp: Date;
}

export interface ModelPrediction {
  id: string;
  modelId: string;
  input: any;
  output: any;
  confidence: number;
  probability?: number[];
  alternatives?: PredictionAlternative[];
  timestamp: Date;
  processingTime: number;
  metadata: PredictionMetadata;
}

export interface PredictionAlternative {
  output: any;
  confidence: number;
  probability?: number;
  reasoning?: string;
}

export interface PredictionMetadata {
  modelVersion: string;
  inputFeatures: string[];
  outputClasses?: string[];
  preprocessingSteps: string[];
  postprocessingSteps: string[];
}

export interface TrainingJob {
  id: string;
  modelId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  config: TrainingConfig;
  metrics: TrainingMetrics;
  startTime?: Date;
  endTime?: Date;
  logs: TrainingLog[];
}

export interface TrainingConfig {
  datasetId: string;
  modelConfig: NeuralNetworkConfig;
  validationSplit: number;
  testSplit: number;
  checkpointFrequency: number;
  maxDuration?: number;
}

export interface TrainingMetrics {
  epoch: number;
  loss: number;
  accuracy: number;
  validationLoss: number;
  validationAccuracy: number;
  learningRate: number;
  timestamp: Date;
}

export interface TrainingLog {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  metadata?: any;
}

export type EventType = 
  | 'system.started'
  | 'system.stopped'
  | 'system.error'
  | 'request.received'
  | 'request.processed'
  | 'request.failed'
  | 'model.trained'
  | 'model.deployed'
  | 'agent.created'
  | 'agent.destroyed'
  | 'knowledge.updated'
  | 'security.violation'
  | 'performance.degraded';

export interface SystemEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  source: string;
  data: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  handled: boolean;
  handledAt?: Date;
  handledBy?: string;
}