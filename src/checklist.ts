import { Task, TaskResult, GoalDefinition } from './types.js';

export class Checklist {
  private tasks: Map<string, Task>;
  public goalDefinition: GoalDefinition;

  constructor(tasks: Task[], goalDefinition: GoalDefinition) {
    this.tasks = new Map(tasks.map(t => [t.id, { ...t, status: 'pending' }]));
    this.goalDefinition = goalDefinition;
  }

  updateTaskStatus(taskId: string, result: TaskResult): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = result.success ? 'completed' : 'failed';
      task.result = result;
      task.completedAt = Date.now();
    }
  }

  setTaskInProgress(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'in_progress';
    }
  }

  getAvailableTasks(): Task[] {
    return Array.from(this.tasks.values()).filter(task => {
      if (task.status !== 'pending') return false;
      
      // Check dependencies
      if (task.dependencies && task.dependencies.length > 0) {
        for (const depId of task.dependencies) {
          const dep = this.tasks.get(depId);
          if (!dep || dep.status !== 'completed') {
            return false;
          }
        }
      }
      
      return true;
    });
  }

  getCompletedTasks(): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.status === 'completed');
  }

  getFailedTasks(): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.status === 'failed');
  }

  getPendingTasks(): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.status === 'pending');
  }

  getInProgressTasks(): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.status === 'in_progress');
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  applyAdjustments(adjustments: any[]): void {
    adjustments.forEach(adj => {
      if (adj.type === 'reorder') {
        const task = this.tasks.get(adj.taskId);
        if (task) task.priority = adj.newPriority;
      } else if (adj.type === 'modify') {
        const task = this.tasks.get(adj.taskId);
        if (task) Object.assign(task, adj.modifications);
      } else if (adj.type === 'add') {
        const newTask: Task = {
          id: adj.task.id || `task_${Date.now()}`,
          name: adj.task.name,
          description: adj.task.description,
          priority: adj.task.priority || 5,
          dependencies: adj.task.dependencies || [],
          successThreshold: adj.task.successThreshold || 0.8,
          estimatedComplexity: adj.task.estimatedComplexity || 5,
          requiresIterativeExecution: adj.task.requiresIterativeExecution || false,
          maxIterations: adj.task.maxIterations || 10,
          requiredCapabilities: adj.task.requiredCapabilities || [],
          status: 'pending'
        };
        this.tasks.set(newTask.id, newTask);
      }
    });
  }

  getProgressSummary(): {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    inProgress: number;
    completionRate: number;
  } {
    const all = this.getAllTasks();
    const completed = this.getCompletedTasks();
    const failed = this.getFailedTasks();
    const pending = this.getPendingTasks();
    const inProgress = this.getInProgressTasks();

    return {
      total: all.length,
      completed: completed.length,
      failed: failed.length,
      pending: pending.length,
      inProgress: inProgress.length,
      completionRate: all.length > 0 ? completed.length / all.length : 0
    };
  }
}