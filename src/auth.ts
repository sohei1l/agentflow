import inquirer from 'inquirer';
import chalk from 'chalk';
import { ConfigManager } from './config.js';

export class AuthManager {
  private configManager: ConfigManager;

  constructor() {
    this.configManager = new ConfigManager();
  }

  public async ensureAuthenticated(): Promise<boolean> {
    const apiKey = this.configManager.getAnthropicApiKey();
    
    if (apiKey) {
      return true;
    }

    console.log(chalk.yellow('⚠️  No Anthropic API key found.'));
    console.log(chalk.blue('🔑 To use AgentFlow, you need to provide your Anthropic API key.'));
    console.log(chalk.gray('   This allows you to use your existing subscription.'));
    
    const { method } = await inquirer.prompt([
      {
        type: 'list',
        name: 'method',
        message: 'How would you like to provide your API key?',
        choices: [
          {
            name: 'Enter API key now (saved to ~/.agentflow.json)',
            value: 'enter'
          },
          {
            name: 'Set ANTHROPIC_API_KEY environment variable',
            value: 'env'
          },
          {
            name: 'Exit and configure manually',
            value: 'exit'
          }
        ]
      }
    ]);

    switch (method) {
      case 'enter':
        return await this.promptForApiKey();
      case 'env':
        this.showEnvironmentInstructions();
        return false;
      case 'exit':
        console.log(chalk.gray('You can configure your API key later by:'));
        console.log(chalk.gray('1. Setting ANTHROPIC_API_KEY environment variable'));
        console.log(chalk.gray('2. Running: agentflow auth login'));
        return false;
      default:
        return false;
    }
  }

  private async promptForApiKey(): Promise<boolean> {
    const { apiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your Anthropic API key:',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'API key cannot be empty';
          }
          if (!input.startsWith('sk-ant-')) {
            return 'Invalid API key format. Anthropic API keys start with "sk-ant-"';
          }
          return true;
        }
      }
    ]);

    try {
      this.configManager.setAnthropicApiKey(apiKey.trim());
      console.log(chalk.green('✅ API key saved successfully!'));
      return true;
    } catch (error) {
      console.error(chalk.red('❌ Failed to save API key:'), error);
      return false;
    }
  }

  private showEnvironmentInstructions(): void {
    console.log(chalk.blue('\n📝 To set up your environment variable:'));
    console.log(chalk.gray('   For bash/zsh: echo "export ANTHROPIC_API_KEY=your_key_here" >> ~/.bashrc'));
    console.log(chalk.gray('   For fish: echo "set -gx ANTHROPIC_API_KEY your_key_here" >> ~/.config/fish/config.fish'));
    console.log(chalk.gray('   Then restart your terminal or run: source ~/.bashrc'));
  }

  public async login(): Promise<void> {
    console.log(chalk.blue('🔐 AgentFlow Authentication'));
    
    const apiKey = this.configManager.getAnthropicApiKey();
    if (apiKey) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'API key already configured. Do you want to update it?',
          default: false
        }
      ]);
      
      if (!overwrite) {
        console.log(chalk.green('✅ Using existing API key'));
        return;
      }
    }

    await this.promptForApiKey();
  }

  public logout(): void {
    const config = this.configManager.getConfig();
    if (config.providers.anthropic.apiKey) {
      config.providers.anthropic.apiKey = undefined;
      this.configManager.updateConfig(config);
      console.log(chalk.green('✅ API key removed from config'));
    } else {
      console.log(chalk.yellow('⚠️  No API key found in config'));
    }
    
    console.log(chalk.gray('Note: Environment variable ANTHROPIC_API_KEY (if set) will still be used'));
  }

  public getStatus(): void {
    const hasConfigKey = !!this.configManager.getConfig().providers.anthropic.apiKey;
    const hasEnvKey = !!process.env.ANTHROPIC_API_KEY;
    const isEnabled = this.configManager.isAnthropicEnabled();

    console.log(chalk.blue('🔍 Authentication Status:'));
    console.log(`   Config file key: ${hasConfigKey ? chalk.green('✅ Set') : chalk.red('❌ Not set')}`);
    console.log(`   Environment key: ${hasEnvKey ? chalk.green('✅ Set') : chalk.red('❌ Not set')}`);
    console.log(`   Service enabled: ${isEnabled ? chalk.green('✅ Ready') : chalk.red('❌ Not ready')}`);
    
    if (!isEnabled) {
      console.log(chalk.yellow('\n💡 Run "agentflow auth login" to configure your API key'));
    }
  }
}