import { v4 as uuidv4 } from 'uuid';
import pLimit from 'p-limit';
import chalk from 'chalk';
import ora from 'ora';
import { 
  Task, 
  TaskResult, 
  ToolResult, 
  GoalDefinition, 
  ExecutionResult, 
  LLMInterface,
  Tool
} from './types.js';
import { Checklist } from './checklist.js';
import { ToolRegistry } from './tool-registry.js';

export class AIAgentOrchestrator {
  private maxIterations: number;
  private confidenceThreshold: number;
  private toolRegistry: ToolRegistry;
  private executionHistory: Array<{
    tool: string;
    task: string;
    input: any;
    output: any;
    duration: number;
    timestamp: number;
  }>;
  private llm: LLMInterface;
  private parallelLimit: pLimit.Limit;

  constructor(config: {
    llm: LLMInterface;
    maxIterations?: number;
    confidenceThreshold?: number;
    parallelExecution?: boolean;
    maxConcurrency?: number;
  }) {
    this.maxIterations = config.maxIterations || 100;
    this.confidenceThreshold = config.confidenceThreshold || 0.8;
    this.toolRegistry = new ToolRegistry();
    this.executionHistory = [];
    this.llm = config.llm;
    
    const maxConcurrency = config.parallelExecution ? (config.maxConcurrency || 3) : 1;
    this.parallelLimit = pLimit(maxConcurrency);
  }

  async achieveGoal(goal: string, context: any = {}): Promise<ExecutionResult> {
    const spinner = ora(`🎯 Initiating goal: "${goal}"`).start();
    
    try {
      // Define success criteria and create execution plan
      const goalDefinition = await this.defineGoal(goal, context);
      spinner.text = '📋 Creating task checklist...';
      const checklist = await this.createChecklist(goalDefinition);
      
      const executionResult: ExecutionResult = {
        goal,
        startTime: Date.now(),
        iterations: 0,
        tasksCompleted: [],
        status: 'in_progress'
      };

      spinner.succeed('✅ Goal analysis and task decomposition complete');

      // Main execution loop
      while (executionResult.iterations < this.maxIterations) {
        // Check if goal is achieved
        if (await this.isGoalAchieved(goalDefinition, checklist)) {
          executionResult.status = 'completed';
          break;
        }

        // Get available tasks for parallel execution
        const availableTasks = checklist.getAvailableTasks();
        if (availableTasks.length === 0) {
          executionResult.status = 'no_viable_tasks';
          break;
        }

        // Execute tasks in parallel (limited by concurrency)
        const tasksToExecute = availableTasks.slice(0, 3); // Execute up to 3 tasks in parallel
        
        console.log(chalk.blue(`\n📊 Iteration ${executionResult.iterations + 1}: Executing ${tasksToExecute.length} task(s)`));
        
        const taskPromises = tasksToExecute.map(task => 
          this.parallelLimit(() => this.executeTaskWithProgress(task, context, checklist))
        );

        const taskResults = await Promise.all(taskPromises);

        // Update checklist and execution state
        for (let i = 0; i < taskResults.length; i++) {
          const task = tasksToExecute[i];
          const result = taskResults[i];
          
          checklist.updateTaskStatus(task.id, result);
          executionResult.tasksCompleted.push({
            task,
            result,
            timestamp: Date.now()
          });
        }

        // Learn from execution and potentially adjust strategy
        await this.reflectAndAdapt(checklist, executionResult);
        
        executionResult.iterations++;

        // Show progress
        const progress = checklist.getProgressSummary();
        console.log(chalk.gray(`   Progress: ${progress.completed}/${progress.total} tasks completed (${Math.round(progress.completionRate * 100)}%)`));
      }

      executionResult.endTime = Date.now();
      executionResult.duration = executionResult.endTime - executionResult.startTime;
      
      return this.generateReport(executionResult, checklist);
    } catch (error) {
      spinner.fail(`❌ Goal execution failed: ${error}`);
      throw error;
    }
  }

  private async executeTaskWithProgress(task: Task, context: any, checklist: Checklist): Promise<TaskResult> {
    checklist.setTaskInProgress(task.id);
    
    const taskSpinner = ora(`🔄 ${task.name}`).start();
    try {
      const result = await this.executeTask(task, context);
      
      if (result.success) {
        taskSpinner.succeed(`✅ ${task.name} (confidence: ${Math.round(result.confidence * 100)}%)`);
      } else {
        taskSpinner.fail(`❌ ${task.name}: ${result.error || 'Unknown error'}`);
      }
      
      return result;
    } catch (error) {
      taskSpinner.fail(`❌ ${task.name}: ${error}`);
      return {
        success: false,
        confidence: 0,
        iterations: 1,
        results: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async defineGoal(goal: string, context: any): Promise<GoalDefinition> {
    const prompt = `
      Given the goal: "${goal}"
      Context: ${JSON.stringify(context)}
      
      Define:
      1. Clear success criteria (list of measurable outcomes)
      2. Key constraints or requirements
      3. Expected outcomes
      4. Potential challenges
      
      Return as JSON with fields: successCriteria, constraints, expectedOutcomes, challenges
    `;

    const definition = await this.llm.analyze(prompt);
    return {
      originalGoal: goal,
      successCriteria: definition.successCriteria || [],
      constraints: definition.constraints || [],
      expectedOutcomes: definition.expectedOutcomes || [],
      challenges: definition.challenges || []
    };
  }

  private async createChecklist(goalDefinition: GoalDefinition): Promise<Checklist> {
    const prompt = `
      Goal: ${JSON.stringify(goalDefinition)}
      
      Create a checklist of tasks that need to be completed.
      For each task, specify:
      - id: unique identifier
      - name: short descriptive name
      - description: detailed description
      - priority: 1-10 (10 being highest)
      - dependencies: array of task IDs this depends on
      - successThreshold: 0-1 (confidence needed to consider complete)
      - estimatedComplexity: 1-10
      - requiresIterativeExecution: boolean
      - maxIterations: number (if iterative)
      - requiredCapabilities: array of required tool capabilities
      
      Return as JSON array of tasks.
    `;

    const tasks = await this.llm.decompose(prompt);
    return new Checklist(tasks, goalDefinition);
  }

  private async executeTask(task: Task, context: any): Promise<TaskResult> {
    // Select tools based on task requirements
    const selectedTools = await this.selectTools(task);
    
    // Handle finite vs infinite tool scenarios
    if (task.requiresIterativeExecution) {
      return await this.executeIterativeTask(task, selectedTools, context);
    } else {
      return await this.executeSingleTask(task, selectedTools, context);
    }
  }

  private async selectTools(task: Task): Promise<Tool[]> {
    const availableTools = this.toolRegistry.getAvailableTools();
    
    const prompt = `
      Task: ${JSON.stringify(task)}
      Available tools: ${JSON.stringify(availableTools.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        capabilities: t.metadata.capabilities
      })))}
      
      Select the most appropriate tool(s) for this task.
      Consider tool capabilities, task requirements, and efficiency.
      Return JSON with 'tools' array containing tool IDs.
    `;

    const selection = await this.llm.selectTools(prompt);
    return selection.tools
      .map(toolId => this.toolRegistry.getTool(toolId))
      .filter((tool): tool is Tool => tool !== undefined);
  }

  private async executeIterativeTask(task: Task, tools: Tool[], context: any): Promise<TaskResult> {
    const results: ToolResult[] = [];
    let confidence = 0;
    let iterations = 0;
    const maxTaskIterations = task.maxIterations || 10;

    while (confidence < task.successThreshold && iterations < maxTaskIterations) {
      for (const tool of tools) {
        const result = await this.callTool(tool, task, context, results);
        results.push(result);
        
        // Evaluate progress
        confidence = await this.evaluateProgress(task, results);
        
        if (confidence >= task.successThreshold) {
          break;
        }
      }
      iterations++;
    }

    return {
      success: confidence >= task.successThreshold,
      confidence,
      iterations,
      results
    };
  }

  private async executeSingleTask(task: Task, tools: Tool[], context: any): Promise<TaskResult> {
    if (tools.length === 0) {
      return {
        success: false,
        confidence: 0,
        iterations: 1,
        results: [],
        error: 'No suitable tools found for this task'
      };
    }

    const tool = tools[0]; // Primary tool
    const result = await this.callTool(tool, task, context);
    
    return {
      success: result.success,
      confidence: result.confidence || 1,
      iterations: 1,
      results: [result]
    };
  }

  private async callTool(tool: Tool, task: Task, context: any, previousResults: ToolResult[] = []): Promise<ToolResult> {
    try {
      // Prepare tool input based on task and context
      const toolInput = await this.prepareToolInput(tool, task, context, previousResults);
      
      // Execute tool
      const startTime = Date.now();
      const result = await tool.execute(toolInput);
      const duration = Date.now() - startTime;

      // Record execution
      this.executionHistory.push({
        tool: tool.name,
        task: task.id,
        input: toolInput,
        output: result,
        duration,
        timestamp: Date.now()
      });

      return {
        success: true,
        tool: tool.name,
        output: result,
        duration,
        confidence: result.confidence || 1
      };
    } catch (error) {
      return {
        success: false,
        tool: tool.name,
        output: null,
        duration: 0,
        confidence: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async prepareToolInput(tool: Tool, task: Task, context: any, previousResults: ToolResult[]): Promise<any> {
    const prompt = `
      Tool: ${tool.name}
      Tool expects: ${JSON.stringify(tool.metadata.inputSchema)}
      Task: ${JSON.stringify(task)}
      Context: ${JSON.stringify(context)}
      Previous results: ${JSON.stringify(previousResults)}
      
      Generate appropriate input for this tool based on the task requirements.
      Return as JSON matching the tool's input schema.
    `;

    return await this.llm.generateToolInput(prompt);
  }

  private async evaluateProgress(task: Task, results: ToolResult[]): Promise<number> {
    const prompt = `
      Task: ${JSON.stringify(task)}
      Results so far: ${JSON.stringify(results)}
      
      Evaluate progress (0-1) towards task completion.
      Consider success criteria and quality of results.
      Return JSON with 'confidence' field.
    `;

    const evaluation = await this.llm.evaluate(prompt);
    return evaluation.confidence;
  }

  private async selectNextTask(checklist: Checklist, executionResult: ExecutionResult): Promise<Task | null> {
    const availableTasks = checklist.getAvailableTasks();
    if (availableTasks.length === 0) return null;

    const prompt = `
      Available tasks: ${JSON.stringify(availableTasks)}
      Completed tasks: ${JSON.stringify(executionResult.tasksCompleted)}
      Goal: ${JSON.stringify(checklist.goalDefinition)}
      
      Select the most appropriate next task considering:
      - Task priority
      - Dependencies
      - Current progress
      - Efficiency
      
      Return JSON with 'taskId' field.
    `;

    const selection = await this.llm.selectTask(prompt);
    return availableTasks.find(t => t.id === selection.taskId) || null;
  }

  private async reflectAndAdapt(checklist: Checklist, executionResult: ExecutionResult): Promise<void> {
    // Analyze execution patterns
    const recentTasks = executionResult.tasksCompleted.slice(-5);
    const failureRate = recentTasks.filter(t => !t.result.success).length / recentTasks.length;

    if (failureRate > 0.6) {
      // High failure rate - reassess strategy
      const prompt = `
        Recent execution history shows high failure rate.
        Tasks: ${JSON.stringify(recentTasks)}
        
        Suggest strategy adjustments:
        - Alternative approaches
        - Different tool selections
        - Task reordering
        - New tasks to add
        
        Return JSON with 'adjustments' array.
      `;

      const adjustments = await this.llm.strategize(prompt);
      checklist.applyAdjustments(adjustments.adjustments || []);
    }
  }

  private async isGoalAchieved(goalDefinition: GoalDefinition, checklist: Checklist): Promise<boolean> {
    const completedTasks = checklist.getCompletedTasks();
    const totalTasks = checklist.getAllTasks().length;
    const completionRate = completedTasks.length / totalTasks;

    const prompt = `
      Goal: ${JSON.stringify(goalDefinition)}
      Completed tasks: ${JSON.stringify(completedTasks)}
      Completion rate: ${completionRate}
      
      Has the goal been achieved? Consider:
      - Success criteria satisfaction
      - Quality of completed tasks
      - Overall objective completion
      
      Return JSON with 'goalAchieved' boolean field.
    `;

    const assessment = await this.llm.assess(prompt);
    return assessment.goalAchieved;
  }

  private generateReport(executionResult: ExecutionResult, checklist: Checklist): ExecutionResult {
    const completedTasks = checklist.getCompletedTasks();
    const failedTasks = checklist.getFailedTasks();
    const pendingTasks = checklist.getPendingTasks();

    // Display final report
    console.log(chalk.blue('\n📊 Execution Report'));
    console.log(chalk.green(`✅ Goal: ${executionResult.goal}`));
    console.log(chalk.white(`📈 Status: ${executionResult.status}`));
    console.log(chalk.gray(`⏱️  Duration: ${executionResult.duration}ms`));
    console.log(chalk.gray(`🔄 Iterations: ${executionResult.iterations}`));
    
    const summary = checklist.getProgressSummary();
    console.log(chalk.white(`📋 Tasks: ${summary.completed} completed, ${summary.failed} failed, ${summary.pending} pending`));
    console.log(chalk.white(`📊 Success Rate: ${Math.round(summary.completionRate * 100)}%`));

    if (completedTasks.length > 0) {
      console.log(chalk.green('\n✅ Completed Tasks:'));
      completedTasks.forEach(task => {
        console.log(chalk.gray(`   • ${task.name}`));
      });
    }

    if (failedTasks.length > 0) {
      console.log(chalk.red('\n❌ Failed Tasks:'));
      failedTasks.forEach(task => {
        console.log(chalk.gray(`   • ${task.name}: ${task.result?.error || 'Unknown error'}`));
      });
    }

    return executionResult;
  }
}