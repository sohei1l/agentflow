# AgentFlow 🤖

AI agent orchestration and management CLI tool for goal-driven autonomous task execution.

AgentFlow is a powerful command-line tool that decomposes complex goals into manageable tasks, selects appropriate tools, and executes them in parallel to achieve desired outcomes using AI-driven decision making.

## ✨ Features

- **Goal-Driven Execution**: Simply describe what you want to achieve, and AgentFlow breaks it down into actionable tasks
- **Parallel Task Execution**: Executes multiple tasks concurrently for faster goal completion
- **Intelligent Tool Selection**: Automatically selects the best tools for each task
- **Adaptive Strategy**: Learns from execution patterns and adjusts strategy in real-time
- **Claude Integration**: Uses your existing Anthropic subscription via API key
- **Extensible Tool Registry**: Easy to add new tools and capabilities
- **Interactive CLI**: User-friendly command-line interface with progress tracking

## 🚀 Installation

### Install from NPM

```bash
npm install -g agentflow
```

### Install from Source

```bash
git clone https://github.com/sohei1l/agentflow.git
cd agentflow
npm install
npm run build
npm link
```

### Install via Homebrew (macOS)

*Coming soon - Homebrew formula in development*

## 🔧 Setup

Before using AgentFlow, you need to configure your Anthropic API key:

### Option 1: Interactive Setup
```bash
agentflow auth login
```

### Option 2: Environment Variable
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

### Option 3: Configuration File
```bash
agentflow config set providers.anthropic.apiKey "your-api-key-here"
```

## 📖 Usage

### Basic Goal Execution

```bash
# Simple goal
agentflow run "Research and summarize the latest AI trends in 2024"

# Interactive mode
agentflow run --interactive

# With additional context
agentflow run "Create a marketing plan" --context '{"company": "TechCorp", "budget": 50000}'
```

### Advanced Options

```bash
# Custom execution parameters
agentflow run "Build a web scraper" --max-iterations 50 --confidence 0.9 --no-parallel

# Show examples
agentflow example
```

### Authentication Management

```bash
# Login with API key
agentflow auth login

# Check authentication status
agentflow auth status

# Logout (remove stored key)
agentflow auth logout
```

### Configuration Management

```bash
# Show current configuration
agentflow config show

# Set configuration values
agentflow config set maxIterations 200
agentflow config set confidenceThreshold 0.85
agentflow config set parallelExecution true
```

## 🎯 Example Goals

AgentFlow can handle a wide variety of goals. Here are some examples:

### Research & Analysis
```bash
agentflow run "Research the top 5 programming languages in 2024 and create a comparison table"
agentflow run "Analyze the latest cybersecurity threats and provide mitigation strategies"
```

### Development Tasks
```bash
agentflow run "Create a REST API design for a todo application"
agentflow run "Generate test cases for a user authentication system"
```

### Business & Marketing
```bash
agentflow run "Develop a social media strategy for a tech startup"
agentflow run "Create a competitive analysis for the CRM software market"
```

### Data & Analytics
```bash
agentflow run "Design a data pipeline for processing customer feedback"
agentflow run "Create a dashboard specification for sales metrics"
```

## 🔧 Configuration

AgentFlow stores configuration in `~/.agentflow.json`. You can customize:

- **maxIterations**: Maximum execution iterations (default: 100)
- **confidenceThreshold**: Task completion confidence threshold (default: 0.8)
- **parallelExecution**: Enable parallel task execution (default: true)
- **providers.anthropic.model**: Claude model to use (default: "claude-3-5-sonnet-20241022")

Example configuration:
```json
{
  "providers": {
    "anthropic": {
      "apiKey": "your-api-key",
      "model": "claude-3-5-sonnet-20241022",
      "disabled": false
    }
  },
  "maxIterations": 100,
  "confidenceThreshold": 0.8,
  "parallelExecution": true
}
```

## 🛠 Available Tools

AgentFlow comes with built-in tools that can be automatically selected for tasks:

- **Web Search**: Search the internet for information
- **Code Executor**: Execute code in various programming languages
- **File System**: Read, write, and manipulate files
- **HTTP Request**: Make API calls and web requests
- **Data Analysis**: Analyze and process data

*Note: Tool implementations are extensible and more tools can be added*

## 📊 Execution Flow

1. **Goal Analysis**: Breaks down your goal into measurable success criteria
2. **Task Decomposition**: Creates a checklist of specific, actionable tasks
3. **Tool Selection**: Chooses appropriate tools for each task
4. **Parallel Execution**: Runs multiple tasks concurrently when possible
5. **Progress Monitoring**: Tracks completion and adjusts strategy as needed
6. **Goal Achievement**: Verifies that the original goal has been accomplished

## 🚨 Prerequisites

- Node.js 16.0 or higher
- Anthropic API key (get one at [console.anthropic.com](https://console.anthropic.com))
- Active Anthropic subscription or credits

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Setup

```bash
git clone https://github.com/sohei1l/agentflow.git
cd agentflow
npm install
npm run dev
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Anthropic's Claude](https://www.anthropic.com) for intelligent task orchestration
- Inspired by goal-driven autonomous agent architectures
- Uses TypeScript for robust type safety and developer experience

## 📞 Support

If you encounter any issues or have questions:

1. Check the [GitHub Issues](https://github.com/sohei1l/agentflow/issues)
2. Create a new issue with detailed information about your problem
3. Include your OS, Node.js version, and AgentFlow version

---

**AgentFlow** - Orchestrate AI agents to achieve your goals autonomously 🎯