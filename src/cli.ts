#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from './config.js';
import { AuthManager } from './auth.js';
import { AIAgentOrchestrator } from './orchestrator.js';
import { AnthropicLLM } from './llm.js';

const program = new Command();
const configManager = new ConfigManager();
const authManager = new AuthManager();

program
  .name('agentflow')
  .description('AI agent orchestration and management CLI tool for goal-driven autonomous task execution')
  .version('1.0.0');

// Auth commands
const authCmd = program
  .command('auth')
  .description('Authentication commands');

authCmd
  .command('login')
  .description('Configure Anthropic API key')
  .action(async () => {
    await authManager.login();
  });

authCmd
  .command('logout')
  .description('Remove stored API key')
  .action(() => {
    authManager.logout();
  });

authCmd
  .command('status')
  .description('Show authentication status')
  .action(() => {
    authManager.getStatus();
  });

// Config commands
const configCmd = program
  .command('config')
  .description('Configuration management');

configCmd
  .command('show')
  .description('Show current configuration')
  .action(() => {
    const config = configManager.getConfig();
    console.log(chalk.blue('📋 Current Configuration:'));
    console.log(JSON.stringify(config, null, 2));
  });

configCmd
  .command('set')
  .description('Set configuration value')
  .argument('<key>', 'Configuration key')
  .argument('<value>', 'Configuration value')
  .action((key: string, value: string) => {
    try {
      const config = configManager.getConfig();
      const keys = key.split('.');
      let current: any = config;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      // Try to parse as JSON, fallback to string
      try {
        current[keys[keys.length - 1]] = JSON.parse(value);
      } catch {
        current[keys[keys.length - 1]] = value;
      }
      
      configManager.updateConfig(config);
      console.log(chalk.green(`✅ Set ${key} = ${value}`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to set config: ${error}`));
    }
  });

// Run command - main orchestration
program
  .command('run')
  .description('Execute a goal using AI agent orchestration')
  .argument('[goal]', 'The goal to achieve')
  .option('-c, --context <context>', 'Additional context as JSON string')
  .option('-i, --interactive', 'Interactive mode for goal input')
  .option('--max-iterations <number>', 'Maximum iterations (default: 100)', '100')
  .option('--confidence <number>', 'Confidence threshold (default: 0.8)', '0.8')
  .option('--no-parallel', 'Disable parallel execution')
  .action(async (goal: string | undefined, options: any) => {
    try {
      // Ensure authentication
      if (!(await authManager.ensureAuthenticated())) {
        process.exit(1);
      }

      let finalGoal = goal;
      let context = {};

      // Interactive mode or missing goal
      if (options.interactive || !finalGoal) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'goal',
            message: 'What goal would you like to achieve?',
            default: finalGoal,
            validate: (input: string) => input.trim().length > 0 || 'Goal cannot be empty'
          },
          {
            type: 'input',
            name: 'context',
            message: 'Additional context (optional, JSON format):',
            default: options.context || '{}',
            validate: (input: string) => {
              if (!input.trim()) return true;
              try {
                JSON.parse(input);
                return true;
              } catch {
                return 'Invalid JSON format';
              }
            }
          }
        ]);
        
        finalGoal = answers.goal;
        if (answers.context.trim()) {
          context = JSON.parse(answers.context);
        }
      } else if (options.context) {
        context = JSON.parse(options.context);
      }

      if (!finalGoal) {
        console.error(chalk.red('❌ Goal is required'));
        process.exit(1);
      }

      // Initialize orchestrator
      const llm = new AnthropicLLM(configManager);
      const orchestrator = new AIAgentOrchestrator({
        llm,
        maxIterations: parseInt(options.maxIterations),
        confidenceThreshold: parseFloat(options.confidence),
        parallelExecution: options.parallel !== false
      });

      // Execute goal
      console.log(chalk.blue(`🚀 Starting AgentFlow execution...\n`));
      const result = await orchestrator.achieveGoal(finalGoal, context);

      // Show completion status
      if (result.status === 'completed') {
        console.log(chalk.green(`\n🎉 Goal completed successfully!`));
      } else if (result.status === 'failed') {
        console.log(chalk.red(`\n💥 Goal execution failed`));
        process.exit(1);
      } else {
        console.log(chalk.yellow(`\n⏸️  Goal execution incomplete: ${result.status}`));
      }

    } catch (error) {
      console.error(chalk.red(`❌ Execution failed: ${error}`));
      process.exit(1);
    }
  });

// Example command
program
  .command('example')
  .description('Show example usage')
  .action(() => {
    console.log(chalk.blue('🎯 AgentFlow Example Usage:\n'));
    
    console.log(chalk.white('Basic goal execution:'));
    console.log(chalk.gray('  agentflow run "Research and summarize the latest AI trends in 2024"\n'));
    
    console.log(chalk.white('Interactive mode:'));
    console.log(chalk.gray('  agentflow run --interactive\n'));
    
    console.log(chalk.white('With context:'));
    console.log(chalk.gray('  agentflow run "Create a marketing plan" --context \'{"company": "TechCorp", "budget": 50000}\'\n'));
    
    console.log(chalk.white('Custom settings:'));
    console.log(chalk.gray('  agentflow run "Build a web scraper" --max-iterations 50 --confidence 0.9 --no-parallel\n'));
    
    console.log(chalk.white('Configuration:'));
    console.log(chalk.gray('  agentflow auth login'));
    console.log(chalk.gray('  agentflow config show'));
    console.log(chalk.gray('  agentflow config set maxIterations 200'));
  });

// Help command override
program
  .command('help')
  .description('Show help information')
  .action(() => {
    console.log(chalk.blue('🤖 AgentFlow - AI Agent Orchestration CLI\n'));
    console.log(chalk.white('AgentFlow is a goal-driven autonomous agent that decomposes objectives'));
    console.log(chalk.white('into tasks, selects appropriate tools, and executes them in parallel.\n'));
    
    program.help();
  });

// Error handling
program.configureHelp({
  formatHelp: (cmd, helper) => {
    return chalk.blue('🤖 AgentFlow - AI Agent Orchestration CLI\n\n') + helper.formatHelp(cmd, helper);
  }
});

program.exitOverride();

try {
  program.parse();
} catch (error: any) {
  if (error.exitCode === 0) {
    // Help was shown, exit normally
    process.exit(0);
  } else {
    console.error(chalk.red(`❌ CLI Error: ${error.message}`));
    process.exit(1);
  }
}