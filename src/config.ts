import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

export interface AgentFlowConfig {
  providers: {
    anthropic: {
      apiKey?: string;
      disabled?: boolean;
      model?: string;
    };
  };
  maxIterations?: number;
  confidenceThreshold?: number;
  parallelExecution?: boolean;
}

export class ConfigManager {
  private configPath: string;
  private config: AgentFlowConfig;

  constructor() {
    this.configPath = join(homedir(), '.agentflow.json');
    this.config = this.loadConfig();
  }

  private loadConfig(): AgentFlowConfig {
    const defaultConfig: AgentFlowConfig = {
      providers: {
        anthropic: {
          disabled: false,
          model: 'claude-3-5-sonnet-20241022'
        }
      },
      maxIterations: 100,
      confidenceThreshold: 0.8,
      parallelExecution: true
    };

    if (existsSync(this.configPath)) {
      try {
        const fileContent = readFileSync(this.configPath, 'utf-8');
        const userConfig = JSON.parse(fileContent);
        return { ...defaultConfig, ...userConfig };
      } catch (error) {
        console.warn('Failed to parse config file, using defaults');
        return defaultConfig;
      }
    }

    return defaultConfig;
  }

  public saveConfig(): void {
    try {
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save config: ${error}`);
    }
  }

  public getConfig(): AgentFlowConfig {
    return this.config;
  }

  public updateConfig(updates: Partial<AgentFlowConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  public getAnthropicApiKey(): string | undefined {
    // Priority: config file > environment variable
    return this.config.providers.anthropic.apiKey || 
           process.env.ANTHROPIC_API_KEY;
  }

  public setAnthropicApiKey(apiKey: string): void {
    this.config.providers.anthropic.apiKey = apiKey;
    this.saveConfig();
  }

  public isAnthropicEnabled(): boolean {
    return !this.config.providers.anthropic.disabled && 
           !!this.getAnthropicApiKey();
  }
}