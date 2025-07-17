import { Tool } from './types.js';

export class ToolRegistry {
  private tools: Map<string, Tool>;

  constructor() {
    this.tools = new Map();
    this.registerDefaultTools();
  }

  registerTool(tool: Tool): void {
    this.tools.set(tool.id, tool);
  }

  getTool(toolId: string): Tool | undefined {
    return this.tools.get(toolId);
  }

  getAvailableTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getToolsByCapability(capability: string): Tool[] {
    return Array.from(this.tools.values()).filter(tool =>
      tool.metadata.capabilities.includes(capability)
    );
  }

  private registerDefaultTools(): void {
    // Web Search Tool
    this.registerTool({
      id: 'web_search',
      name: 'Web Search',
      description: 'Search the web for information',
      metadata: {
        capabilities: ['search', 'research', 'information_gathering'],
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            maxResults: { type: 'number', default: 10 }
          },
          required: ['query']
        },
        outputSchema: {
          type: 'object',
          properties: {
            results: { type: 'array' },
            confidence: { type: 'number' }
          }
        }
      },
      execute: async (input: { query: string; maxResults?: number }) => {
        // Placeholder implementation - in real implementation, this would use a search API
        return {
          results: [`Search results for: ${input.query}`],
          confidence: 0.8,
          success: true
        };
      }
    });

    // Code Executor Tool
    this.registerTool({
      id: 'code_executor',
      name: 'Code Executor',
      description: 'Execute code in various languages',
      metadata: {
        capabilities: ['execute', 'test', 'code_analysis'],
        inputSchema: {
          type: 'object',
          properties: {
            language: { type: 'string' },
            code: { type: 'string' },
            timeout: { type: 'number', default: 30000 }
          },
          required: ['language', 'code']
        },
        outputSchema: {
          type: 'object',
          properties: {
            output: { type: 'string' },
            exitCode: { type: 'number' },
            error: { type: 'string' }
          }
        }
      },
      execute: async (input: { language: string; code: string; timeout?: number }) => {
        // Placeholder implementation - in real implementation, this would execute code safely
        return {
          output: `Executed ${input.language} code: ${input.code.substring(0, 50)}...`,
          exitCode: 0,
          confidence: 0.9,
          success: true
        };
      }
    });

    // File System Tool
    this.registerTool({
      id: 'file_system',
      name: 'File System',
      description: 'Read, write, and manipulate files',
      metadata: {
        capabilities: ['file_read', 'file_write', 'file_manipulation'],
        inputSchema: {
          type: 'object',
          properties: {
            operation: { type: 'string', enum: ['read', 'write', 'list', 'delete'] },
            path: { type: 'string' },
            content: { type: 'string' }
          },
          required: ['operation', 'path']
        },
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            result: { type: 'string' }
          }
        }
      },
      execute: async (input: { operation: string; path: string; content?: string }) => {
        // Placeholder implementation - in real implementation, this would interact with the file system
        return {
          success: true,
          result: `${input.operation} operation on ${input.path}`,
          confidence: 0.95
        };
      }
    });

    // HTTP Request Tool
    this.registerTool({
      id: 'http_request',
      name: 'HTTP Request',
      description: 'Make HTTP requests to APIs',
      metadata: {
        capabilities: ['api_call', 'http_request', 'data_fetch'],
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            method: { type: 'string', default: 'GET' },
            headers: { type: 'object' },
            body: { type: 'string' }
          },
          required: ['url']
        },
        outputSchema: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            data: { type: 'object' },
            headers: { type: 'object' }
          }
        }
      },
      execute: async (input: { url: string; method?: string; headers?: any; body?: string }) => {
        // Placeholder implementation - in real implementation, this would make actual HTTP requests
        return {
          status: 200,
          data: { message: `${input.method || 'GET'} request to ${input.url}` },
          headers: {},
          confidence: 0.9,
          success: true
        };
      }
    });

    // Data Analysis Tool
    this.registerTool({
      id: 'data_analysis',
      name: 'Data Analysis',
      description: 'Analyze and process data',
      metadata: {
        capabilities: ['data_analysis', 'statistics', 'visualization'],
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'array' },
            analysisType: { type: 'string' },
            parameters: { type: 'object' }
          },
          required: ['data', 'analysisType']
        },
        outputSchema: {
          type: 'object',
          properties: {
            results: { type: 'object' },
            insights: { type: 'array' }
          }
        }
      },
      execute: async (input: { data: any[]; analysisType: string; parameters?: any }) => {
        // Placeholder implementation - in real implementation, this would perform data analysis
        return {
          results: { summary: `Analysis of ${input.data.length} data points` },
          insights: [`Performed ${input.analysisType} analysis`],
          confidence: 0.85,
          success: true
        };
      }
    });
  }
}