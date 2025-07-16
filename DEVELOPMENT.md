# API Journey Builder - Development Guide

## Project Structure

```
api-journey-builder-extension/
├── src/
│   ├── extension.ts              # Main extension entry point
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces
│   ├── services/
│   │   └── aiService.ts         # AI analysis service
│   └── providers/
│       └── apiJourneyProvider.ts # Webview provider
├── media/
│   ├── main.js                  # Webview JavaScript
│   └── style.css                # Webview CSS
├── out/                         # Compiled JavaScript (generated)
├── .vscode/
│   ├── launch.json              # Debug configuration
│   └── tasks.json               # Build tasks
├── package.json                 # Extension manifest
├── tsconfig.json                # TypeScript configuration
└── README.md                    # Documentation
```

## How to Run

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Compile TypeScript**
   ```bash
   npm run compile
   ```

3. **Run Extension**
   - Open this folder in VS Code
   - Press `F5` to launch Extension Development Host
   - Or use "Run Extension" from the debug panel

## How to Use

### Method 1: Context Menu
1. Right-click on any function name in your code
2. Select "✨ Generate API Journey"
3. View results in the API Journey Builder panel

### Method 2: Side Panel
1. Open Explorer view in VS Code
2. Find "API Journey Builder" panel
3. Type function name and click "Analyze"

## Features Implemented

- ✅ Function name detection from cursor position
- ✅ Function caller analysis
- ✅ Function callee analysis  
- ✅ API endpoint detection
- ✅ Database interaction detection
- ✅ Cache interaction detection
- ✅ Message queue interaction detection
- ✅ Mermaid diagram generation
- ✅ Detailed markdown writeup
- ✅ Beautiful VS Code-themed UI
- ✅ Recent searches history
- ✅ Loading and error states
- ✅ Tabbed interface (Diagram/Details)

## Architecture

### Extension Host (Node.js)
- `extension.ts` - Registers commands and providers
- `aiService.ts` - Analyzes functions using VS Code APIs
- `apiJourneyProvider.ts` - Manages webview lifecycle

### Webview (Browser)
- `main.js` - Handles UI interactions and messaging
- `style.css` - VS Code-themed styling
- Mermaid.js - Renders diagrams

## Next Steps for Enhancement

1. **AI Integration**: Replace basic regex analysis with actual AI models
2. **AST Parsing**: Use proper TypeScript/JavaScript AST parsing
3. **Cross-Service Analysis**: Trace across microservice boundaries
4. **Performance**: Cache analysis results
5. **Testing**: Add unit and integration tests
6. **Packaging**: Create VSIX package for distribution

## Development Commands

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Lint code
npm run lint

# Run tests (when implemented)
npm test
```

## Extension Manifest

The extension contributes:
- Commands: `apiJourneyBuilder.generate`, `apiJourneyBuilder.openPanel`
- Views: API Journey Builder panel in Explorer
- Menus: Context menu item for selected text
- Activation: On command execution

## VS Code APIs Used

- `vscode.workspace.findFiles()` - Find files in workspace
- `vscode.workspace.openTextDocument()` - Read file contents
- `vscode.window.registerWebviewViewProvider()` - Create webview panel
- `vscode.commands.registerCommand()` - Register commands
- `vscode.window.activeTextEditor` - Get current editor
- `vscode.window.showInformationMessage()` - Show notifications

This extension demonstrates a complete VS Code extension with webview integration, file analysis, and AI-powered insights.
