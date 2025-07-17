export interface Task {
  id: string;
  name: string;
  description: string;
  priority: number;
  dependencies?: string[];
  successThreshold: number;
  estimatedComplexity: number;
  requiresIterativeExecution: boolean;
  maxIterations?: number;
  requiredCapabilities: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: TaskResult;
  completedAt?: number;
}

export interface TaskResult {
  success: boolean;
  confidence: number;
  iterations: number;
  results: ToolResult[];
  duration?: number;
  error?: string;
}

export interface ToolResult {
  success: boolean;
  tool: string;
  output: any;
  duration: number;
  confidence: number;
  error?: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  metadata: {
    capabilities: string[];
    inputSchema: any;
    outputSchema: any;
  };
  execute(input: any): Promise<any>;
}

export interface GoalDefinition {
  originalGoal: string;
  successCriteria: string[];
  constraints: string[];
  expectedOutcomes: string[];
  challenges: string[];
}

export interface ExecutionResult {
  goal: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  iterations: number;
  tasksCompleted: Array<{
    task: Task;
    result: TaskResult;
    timestamp: number;
  }>;
  status: 'in_progress' | 'completed' | 'failed' | 'no_viable_tasks';
}

export interface LLMInterface {
  analyze(prompt: string): Promise<any>;
  decompose(prompt: string): Promise<Task[]>;
  selectTools(prompt: string): Promise<{ tools: string[] }>;
  selectTask(prompt: string): Promise<{ taskId: string }>;
  generateToolInput(prompt: string): Promise<any>;
  evaluate(prompt: string): Promise<{ confidence: number }>;
  strategize(prompt: string): Promise<any>;
  assess(prompt: string): Promise<{ goalAchieved: boolean }>;
}