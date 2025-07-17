import Anthropic from '@anthropic-ai/sdk';
import { LLMInterface, Task } from './types.js';
import { ConfigManager } from './config.js';

export class AnthropicLLM implements LLMInterface {
  private client: Anthropic;
  private model: string;

  constructor(configManager: ConfigManager) {
    const apiKey = configManager.getAnthropicApiKey();
    if (!apiKey) {
      throw new Error('Anthropic API key not found');
    }

    this.client = new Anthropic({ apiKey });
    this.model = configManager.getConfig().providers.anthropic.model || 'claude-3-5-sonnet-20241022';
  }

  private async makeRequest(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return response.content[0].type === 'text' ? response.content[0].text : '';
    } catch (error) {
      throw new Error(`LLM request failed: ${error}`);
    }
  }

  async analyze(prompt: string): Promise<any> {
    const systemPrompt = `You are an AI goal analysis expert. Analyze the given goal and provide a structured response with clear success criteria, constraints, expected outcomes, and potential challenges. Return your response as valid JSON.`;
    
    const response = await this.makeRequest(prompt, systemPrompt);
    try {
      return JSON.parse(response);
    } catch {
      throw new Error('Failed to parse goal analysis response');
    }
  }

  async decompose(prompt: string): Promise<Task[]> {
    const systemPrompt = `You are an AI task decomposition expert. Break down the given goal into specific, actionable tasks. Each task should have a unique ID, clear name, description, priority (1-10), success threshold (0-1), estimated complexity (1-10), and required capabilities. Return the tasks as a valid JSON array.`;
    
    const response = await this.makeRequest(prompt, systemPrompt);
    try {
      const tasks = JSON.parse(response);
      return tasks.map((task: any, index: number) => ({
        id: task.id || `task_${index + 1}`,
        name: task.name || `Task ${index + 1}`,
        description: task.description || '',
        priority: task.priority || 5,
        dependencies: task.dependencies || [],
        successThreshold: task.successThreshold || 0.8,
        estimatedComplexity: task.estimatedComplexity || 5,
        requiresIterativeExecution: task.requiresIterativeExecution || false,
        maxIterations: task.maxIterations || 10,
        requiredCapabilities: task.requiredCapabilities || [],
        status: 'pending' as const
      }));
    } catch {
      throw new Error('Failed to parse task decomposition response');
    }
  }

  async selectTools(prompt: string): Promise<{ tools: string[] }> {
    const systemPrompt = `You are an AI tool selection expert. Based on the task requirements and available tools, select the most appropriate tools. Return your response as valid JSON with a 'tools' array containing tool IDs.`;
    
    const response = await this.makeRequest(prompt, systemPrompt);
    try {
      return JSON.parse(response);
    } catch {
      return { tools: [] };
    }
  }

  async selectTask(prompt: string): Promise<{ taskId: string }> {
    const systemPrompt = `You are an AI task prioritization expert. Based on the current state and available tasks, select the most appropriate next task to execute. Return your response as valid JSON with a 'taskId' field.`;
    
    const response = await this.makeRequest(prompt, systemPrompt);
    try {
      return JSON.parse(response);
    } catch {
      throw new Error('Failed to select next task');
    }
  }

  async generateToolInput(prompt: string): Promise<any> {
    const systemPrompt = `You are an AI tool input generator. Based on the tool requirements and context, generate appropriate input parameters. Return your response as valid JSON.`;
    
    const response = await this.makeRequest(prompt, systemPrompt);
    try {
      return JSON.parse(response);
    } catch {
      throw new Error('Failed to generate tool input');
    }
  }

  async evaluate(prompt: string): Promise<{ confidence: number }> {
    const systemPrompt = `You are an AI progress evaluator. Assess the progress towards task completion and return a confidence score between 0 and 1. Return your response as valid JSON with a 'confidence' field.`;
    
    const response = await this.makeRequest(prompt, systemPrompt);
    try {
      const result = JSON.parse(response);
      return { confidence: Math.max(0, Math.min(1, result.confidence || 0)) };
    } catch {
      return { confidence: 0 };
    }
  }

  async strategize(prompt: string): Promise<any> {
    const systemPrompt = `You are an AI strategy advisor. Analyze the execution patterns and suggest strategic adjustments to improve success rates. Return your response as valid JSON with suggested adjustments.`;
    
    const response = await this.makeRequest(prompt, systemPrompt);
    try {
      return JSON.parse(response);
    } catch {
      return { adjustments: [] };
    }
  }

  async assess(prompt: string): Promise<{ goalAchieved: boolean }> {
    const systemPrompt = `You are an AI goal assessment expert. Determine if the given goal has been achieved based on the provided criteria and completed tasks. Return your response as valid JSON with a 'goalAchieved' boolean field.`;
    
    const response = await this.makeRequest(prompt, systemPrompt);
    try {
      return JSON.parse(response);
    } catch {
      return { goalAchieved: false };
    }
  }
}