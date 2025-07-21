import * as vscode from 'vscode';
import { AIService } from './services/aiService';

export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 AI-Powered API Journey Builder extension is now active!');

    // Initialize AI service
    console.log('🔧 Initializing AI service...');
    const aiService = new AIService();
    console.log('✅ AI service initialized');

    // Register the generate command (right-click context menu)
    const generateCommand = vscode.commands.registerCommand('apiJourneyBuilder.generate', async () => {
        console.log(`\n🎯 === API JOURNEY COMMAND TRIGGERED ===`);
        
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            console.log(`❌ No active editor found`);
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        console.log(`📝 Active editor: ${editor.document.fileName}`);

        const selection = editor.selection;
        let functionName: string;

        if (selection.isEmpty) {
            console.log(`🔍 No selection, trying to get word at cursor...`);
            // If no selection, try to get the word at cursor position
            const wordRange = editor.document.getWordRangeAtPosition(selection.active);
            if (wordRange) {
                functionName = editor.document.getText(wordRange);
                console.log(`✅ Found word at cursor: "${functionName}"`);
            } else {
                console.log(`❌ No word found at cursor position`);
                vscode.window.showErrorMessage('Please select a function name or place cursor on a function');
                return;
            }
        } else {
            functionName = editor.document.getText(selection);
            console.log(`✅ Selected text: "${functionName}"`);
        }

        if (!functionName.trim()) {
            console.log(`❌ Empty function name`);
            vscode.window.showErrorMessage('Please select a valid function name');
            return;
        }

        console.log(`🚀 Starting analysis for function: "${functionName.trim()}"`);

        // Show progress notification
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `🤖 AI Analyzing ${functionName}...`,
            cancellable: false
        }, async (progress) => {
            try {
                console.log(`📊 Progress: Gathering code context...`);
                progress.report({ message: 'Gathering code context...' });
                
                // Analyze the function using AI
                console.log(`🤖 Calling aiService.analyzeFunction("${functionName.trim()}")...`);
                const result = await aiService.analyzeFunction(functionName.trim());
                
                console.log(`📊 Progress: Generating detailed analysis...`);
                progress.report({ message: 'Generating detailed analysis...' });
                
                // Create and show webview panel
                console.log(`🎨 Creating webview panel...`);
                await showAnalysisInWebview(context, result, functionName);
                
                console.log(`✅ === ANALYSIS COMPLETED SUCCESSFULLY ===\n`);
                vscode.window.showInformationMessage(`🎉 AI Journey analysis completed for ${functionName}`);
            } catch (error) {
                console.error(`❌ === ANALYSIS FAILED ===`);
                console.error('AI Analysis error:', error);
                if (error instanceof Error) {
                    console.error(`   Error name: ${error.name}`);
                    console.error(`   Error message: ${error.message}`);
                    console.error(`   Error stack: ${error.stack}`);
                }
                vscode.window.showErrorMessage(`Failed to generate AI journey: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    });

    // Register command for navigation (for clickable links)
    const navigateCommand = vscode.commands.registerCommand('apiJourneyBuilder.navigate', async (filePath: string, lineNumber: number) => {
        console.log(`🧭 Navigation command called with: filePath="${filePath}", lineNumber=${lineNumber}`);
        try {
            // Validate inputs
            if (!filePath) {
                throw new Error('File path is required');
            }
            if (!lineNumber || lineNumber < 1) {
                lineNumber = 1;
                console.warn('⚠️ Invalid line number, defaulting to line 1');
            }
            
            console.log(`📁 Opening document: ${filePath}`);
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            
            console.log(`📄 Document opened, showing in editor...`);
            const editor = await vscode.window.showTextDocument(document);
            
            // Navigate to specific line
            console.log(`🎯 Navigating to line ${lineNumber}`);
            const position = new vscode.Position(lineNumber - 1, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position));
            
            console.log(`✅ Navigation completed successfully`);
        } catch (error) {
            console.error(`❌ Navigation failed:`, error);
            vscode.window.showErrorMessage(`Failed to navigate to ${filePath}:${lineNumber}`);
        }
    });

    async function showAnalysisInWebview(context: vscode.ExtensionContext, result: any, functionName: string) {
        // Create and show a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'apiJourneyAnalysis',
            `🚀 AI Journey: ${functionName}`,
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            async (message) => {
                console.log('📨 Webview message received:', message);
                switch (message.command) {
                    case 'navigate':
                        console.log(`🔗 Attempting to navigate to: ${message.filePath}:${message.lineNumber}`);
                        try {
                            await vscode.commands.executeCommand('apiJourneyBuilder.navigate', message.filePath, message.lineNumber);
                            console.log('✅ Navigation command executed successfully');
                        } catch (error: any) {
                            console.error('❌ Navigation command failed:', error);
                            vscode.window.showErrorMessage(`Failed to navigate to ${message.filePath}:${message.lineNumber}`);
                        }
                        break;
                    case 'openFile':
                        console.log(`📂 Attempting to open file: ${message.filePath}`);
                        try {
                            const doc = await vscode.workspace.openTextDocument(message.filePath);
                            await vscode.window.showTextDocument(doc);
                            console.log('✅ File opened successfully');
                        } catch (error: any) {
                            console.error('❌ Failed to open file:', error);
                            vscode.window.showErrorMessage(`Failed to open file ${message.filePath}`);
                        }
                        break;
                    default:
                        console.warn('🤷‍♂️ Unknown webview message command:', message.command);
                }
            },
            undefined,
            context.subscriptions
        );

        // Set the HTML content
        panel.webview.html = generateWebviewContent(result, functionName);
    }

    function generateWebviewContent(result: any, functionName: string): string {
        const timestamp = new Date().toLocaleString();
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Journey Analysis</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 700;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .header .subtitle {
            margin: 10px 0 0 0;
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .content {
            padding: 30px;
        }
        
        .section {
            margin-bottom: 40px;
            background: #f8f9fa;
            border-radius: 10px;
            padding: 25px;
            border-left: 5px solid #667eea;
        }
        
        .section h2 {
            margin: 0 0 20px 0;
            color: #667eea;
            font-size: 1.8em;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .badge {
            background: #667eea;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: 600;
        }
        
        .function-item {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
            border-left: 4px solid #28a745;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        
        .function-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .function-item.upstream {
            border-left-color: #17a2b8;
        }
        
        .function-item.downstream {
            border-left-color: #28a745;
        }
        
        .function-item.api {
            border-left-color: #fd7e14;
        }
        
        .function-item.database {
            border-left-color: #6f42c1;
        }
        
        .function-name {
            font-size: 1.3em;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        
        .function-meta {
            display: flex;
            gap: 15px;
            margin: 10px 0;
            flex-wrap: wrap;
        }
        
        .meta-item {
            background: #e9ecef;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 0.9em;
            font-weight: 500;
        }
        
        .complexity-high { background: #f8d7da; color: #721c24; }
        .complexity-medium { background: #fff3cd; color: #856404; }
        .complexity-low { background: #d4edda; color: #155724; }
        
        .navigate-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.9em;
            transition: background 0.2s;
        }
        
        .navigate-btn:hover {
            background: #5a6fd8;
        }
        
        .diagram-container {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            position: relative;
            overflow: auto;
            border: 2px solid #e9ecef;
        }
        
        .diagram-controls {
            position: absolute;
            top: 10px;
            right: 10px;
            display: flex;
            gap: 5px;
            z-index: 10;
        }
        
        .zoom-btn {
            background: #667eea;
            color: white;
            border: none;
            border-radius: 50%;
            width: 35px;
            height: 35px;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: all 0.2s;
        }
        
        .zoom-btn:hover {
            background: #5a6fd8;
            transform: scale(1.1);
        }
        
        .fullscreen-btn {
            background: #28a745;
            color: white;
            border: none;
            border-radius: 50%;
            width: 35px;
            height: 35px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: all 0.2s;
        }
        
        .fullscreen-btn:hover {
            background: #218838;
            transform: scale(1.1);
        }
        
        .diagram-wrapper {
            transition: transform 0.3s ease;
            transform-origin: center center;
        }
        
        /* Fullscreen Modal Styles */
        .modal-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 9999;
            overflow: auto;
        }
        
        .modal-content {
            position: relative;
            width: 90%;
            height: 90%;
            margin: 5% auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        .modal-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-title {
            font-size: 1.5em;
            font-weight: 600;
            margin: 0;
        }
        
        .modal-shortcuts {
            margin-top: 5px;
        }
        
        .modal-shortcuts small {
            color: rgba(255,255,255,0.8);
            font-size: 0.85em;
            background: rgba(255,255,255,0.1);
            padding: 4px 8px;
            border-radius: 12px;
            display: inline-block;
        }
        
        .close-btn {
            background: rgba(255,255,255,0.2);
            color: white;
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            cursor: pointer;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        
        .close-btn:hover {
            background: rgba(255,255,255,0.3);
            transform: scale(1.1);
        }
        
        .modal-diagram-container {
            position: relative;
            height: calc(100% - 80px);
            overflow: auto;
            padding: 20px;
            background: #f8f9fa;
        }
        
        .modal-zoom-controls {
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 10;
        }
        
        .modal-zoom-btn {
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 15px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: all 0.2s;
            min-width: 45px;
        }
        
        .modal-zoom-btn:hover {
            background: #5a6fd8;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        
        .zoom-level-display {
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }
        
        .modal-diagram-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100%;
            transition: transform 0.3s ease;
            transform-origin: center center;
        }
        
        .modal-diagram-wrapper .mermaid {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            max-width: none;
        }
        
        .no-items {
            text-align: center;
            color: #6c757d;
            font-style: italic;
            padding: 20px;
        }
        
        .summary-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .stat-number {
            font-size: 2.5em;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 5px;
        }
        
        .stat-label {
            color: #6c757d;
            font-weight: 500;
        }
        
        .mermaid {
            text-align: center;
        }
        
        .generated-info {
            text-align: center;
            color: #6c757d;
            font-size: 0.9em;
            margin-top: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 AI Journey Analysis</h1>
            <div class="subtitle">Function: <strong>${functionName}</strong></div>
            <div class="subtitle">Generated: ${timestamp}</div>
        </div>
        
        <div class="content">
            <!-- Summary Stats -->
            <div class="summary-stats">
                <div class="stat-card">
                    <div class="stat-number">${result.upstream?.length || 0}</div>
                    <div class="stat-label">⬆️ Upstream Callers</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${result.downstream?.length || 0}</div>
                    <div class="stat-label">⬇️ Downstream Calls</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${(result.apiEndpoints?.length || 0) + (result.databaseInteractions?.length || 0) + (result.cacheInteractions?.length || 0) + (result.messageQueueInteractions?.length || 0)}</div>
                    <div class="stat-label">🌐 External Integrations</div>
                </div>
            </div>
            
            <!-- Mermaid Diagram -->
            ${result.diagram ? `
            <div class="section">
                <h2>📊 Execution Flow Diagram</h2>
                <div style="margin-bottom: 10px;">
                    <button onclick="testFunction()" style="background: #ff6b6b; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">
                        🧪 Test JavaScript
                    </button>
                </div>
                <div class="diagram-container">
                    <div class="diagram-controls">
                        <button class="zoom-btn" onclick="zoomIn()">+</button>
                        <button class="zoom-btn" onclick="zoomOut()">-</button>
                        <button class="zoom-btn" onclick="resetZoom()" title="Reset Zoom">⌂</button>
                        <button class="fullscreen-btn" onclick="openFullscreen()" title="Open in Fullscreen">⛶</button>
                    </div>
                    <div class="diagram-wrapper">
                        <div class="mermaid">
                            ${result.diagram}
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}
            
            <!-- Fullscreen Modal (always present) -->
            <div id="diagramModal" class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">📊 Execution Flow Diagram - Fullscreen View</h2>
                        <div class="modal-shortcuts">
                            <small>🎯 Shortcuts: ESC (close) | +/- (zoom) | 0 (reset) | Mouse wheel (zoom)</small>
                        </div>
                        <button class="close-btn" onclick="closeFullscreen()">×</button>
                    </div>
                    <div class="modal-diagram-container">
                        <div class="modal-zoom-controls">
                            <button class="modal-zoom-btn" onclick="modalZoomIn()">Zoom In</button>
                            <button class="modal-zoom-btn" onclick="modalZoomOut()">Zoom Out</button>
                            <button class="modal-zoom-btn" onclick="modalResetZoom()">Reset</button>
                            <div class="zoom-level-display" id="zoomLevel">100%</div>
                        </div>
                        <div class="modal-diagram-wrapper" id="modalDiagramWrapper">
                            <div class="mermaid" id="modalMermaid">
                                ${result.diagram || 'No diagram available'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Upstream Functions -->
            <div class="section">
                <h2>⬆️ Upstream Analysis <span class="badge">${result.upstream?.length || 0}</span></h2>
                ${result.upstream?.length > 0 ? 
                    result.upstream.map((func: any, index: number) => `
                        <div class="function-item upstream">
                            <div class="function-name">${func.functionName}</div>
                            <div class="function-meta">
                                <span class="meta-item">📂 ${func.filePath?.split('/').pop() || 'Unknown'}:${func.lineNumber || '?'}</span>
                            </div>
                            <div><strong>Purpose:</strong> ${func.purpose || 'Not specified'}</div>
                            <div><strong>Context:</strong> ${func.context || 'Not specified'}</div>
                            <button class="navigate-btn" onclick="navigate('${func.filePath?.replace(/'/g, "\\'")}', ${func.lineNumber || 0})">
                                🔗 Go to Function
                            </button>
                        </div>
                    `).join('') 
                    : '<div class="no-items">No upstream callers found. This function might be an entry point.</div>'
                }
            </div>
            
            <!-- Downstream Functions -->
            <div class="section">
                <h2>⬇️ Downstream Analysis <span class="badge">${result.downstream?.length || 0}</span></h2>
                ${result.downstream?.length > 0 ? 
                    result.downstream.map((func: any, index: number) => `
                        <div class="function-item downstream">
                            <div class="function-name">${func.functionName}</div>
                            <div class="function-meta">
                                <span class="meta-item">📂 ${func.filePath?.split('/').pop() || 'Unknown'}:${func.lineNumber || '?'}</span>
                                <span class="meta-item complexity-${func.complexity || 'low'}">⚡ ${(func.complexity || 'low').toUpperCase()}</span>
                                ${func.returnType ? `<span class="meta-item">📤 ${func.returnType}</span>` : ''}
                            </div>
                            <div><strong>Purpose:</strong> ${func.purpose || 'Not specified'}</div>
                            ${func.parameters?.length > 0 ? `<div><strong>Parameters:</strong> ${func.parameters.join(', ')}</div>` : ''}
                            <button class="navigate-btn" onclick="navigate('${func.filePath?.replace(/'/g, "\\'")}', ${func.lineNumber || 0})">
                                🔗 Go to Function
                            </button>
                        </div>
                    `).join('') 
                    : '<div class="no-items">No downstream function calls detected. This function might be a leaf function.</div>'
                }
            </div>
            
            <!-- API Endpoints -->
            ${result.apiEndpoints?.length > 0 ? `
            <div class="section">
                <h2>🌐 API Endpoints <span class="badge">${result.apiEndpoints.length}</span></h2>
                ${result.apiEndpoints.map((endpoint: any, index: number) => `
                    <div class="function-item api">
                        <div class="function-name">${endpoint.method?.toUpperCase() || 'GET'} ${endpoint.path || '/'}</div>
                        <div class="function-meta">
                            <span class="meta-item">📍 Line ${endpoint.lineNumber || '?'}</span>
                        </div>
                        <div><strong>Purpose:</strong> ${endpoint.purpose || 'Not specified'}</div>
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            <!-- Database Interactions -->
            ${result.databaseInteractions?.length > 0 ? `
            <div class="section">
                <h2>🗄️ Database Interactions <span class="badge">${result.databaseInteractions.length}</span></h2>
                ${result.databaseInteractions.map((db: any, index: number) => `
                    <div class="function-item database">
                        <div class="function-name">${db.operation?.toUpperCase() || 'QUERY'}</div>
                        <div class="function-meta">
                            <span class="meta-item">📍 Line ${db.lineNumber || '?'}</span>
                            ${db.table ? `<span class="meta-item">📋 ${db.table}</span>` : ''}
                        </div>
                        <div><strong>Purpose:</strong> ${db.purpose || 'Not specified'}</div>
                        ${db.query ? `<div><strong>Query:</strong> <code>${db.query}</code></div>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            <!-- Cache Interactions -->
            ${result.cacheInteractions?.length > 0 ? `
            <div class="section">
                <h2>⚡ Cache Interactions <span class="badge">${result.cacheInteractions.length}</span></h2>
                ${result.cacheInteractions.map((cache: any, index: number) => `
                    <div class="function-item">
                        <div class="function-name">${cache.operation?.toUpperCase() || 'CACHE'}</div>
                        <div class="function-meta">
                            <span class="meta-item">📍 Line ${cache.lineNumber || '?'}</span>
                            ${cache.key ? `<span class="meta-item">🔑 ${cache.key}</span>` : ''}
                        </div>
                        <div><strong>Purpose:</strong> ${cache.purpose || 'Not specified'}</div>
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            <!-- Message Queue Interactions -->
            ${result.messageQueueInteractions?.length > 0 ? `
            <div class="section">
                <h2>📨 Message Queue Interactions <span class="badge">${result.messageQueueInteractions.length}</span></h2>
                ${result.messageQueueInteractions.map((mq: any, index: number) => `
                    <div class="function-item">
                        <div class="function-name">${mq.operation?.toUpperCase() || 'MESSAGE'}</div>
                        <div class="function-meta">
                            <span class="meta-item">📍 Line ${mq.lineNumber || '?'}</span>
                            ${mq.queue ? `<span class="meta-item">📬 ${mq.queue}</span>` : ''}
                        </div>
                        <div><strong>Purpose:</strong> ${mq.purpose || 'Not specified'}</div>
                        ${mq.message ? `<div><strong>Message:</strong> ${mq.message}</div>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            <div class="generated-info">
                🤖 This analysis was generated using AI-powered code analysis<br>
                Click the "Go to Function" buttons to navigate directly to code locations
            </div>
        </div>
    </div>

    <script>
        // Initialize Mermaid
        mermaid.initialize({ 
            startOnLoad: true,
            theme: 'default',
            securityLevel: 'loose'
        });
        
        // Get VS Code API
        const vscode = acquireVsCodeApi();
        
        // Add console logging for debugging
        console.log('🔧 Webview JavaScript initialized');
        
        // Zoom functions for Mermaid diagram
        let currentZoom = 1.0;
        const zoomStep = 0.2;
        const minZoom = 0.5;
        const maxZoom = 3.0;
        
        function zoomIn() {
            console.log('🔍 zoomIn called, currentZoom:', currentZoom);
            if (currentZoom < maxZoom) {
                currentZoom += zoomStep;
                updateZoom();
                console.log('✅ Zoomed in to:', currentZoom);
            } else {
                console.log('⚠️ Max zoom reached');
            }
        }
 
        function zoomOut() {
            console.log('🔍 zoomOut called, currentZoom:', currentZoom);
            if (currentZoom > minZoom) {
                currentZoom -= zoomStep;
                updateZoom();
                console.log('✅ Zoomed out to:', currentZoom);
            } else {
                console.log('⚠️ Min zoom reached');
            }
        }
        
        function updateZoom() {
            const wrapper = document.querySelector('.diagram-wrapper');
            console.log('🔧 updateZoom called, wrapper found:', !!wrapper);
            if (wrapper) {
                wrapper.style.transform = 'scale(' + currentZoom + ')';
                console.log('✅ Applied transform: scale(' + currentZoom + ')');
            } else {
                console.error('❌ .diagram-wrapper not found');
            }
        }
        
        function resetZoom() {
            console.log('🔄 resetZoom called');
            currentZoom = 1.0;
            updateZoom();
        }

        // Fullscreen functions
        let modalZoom = 1.0;
        
        function openFullscreen() {
            console.log('🖼️ openFullscreen called');
            const modal = document.getElementById('diagramModal');
            console.log('🔧 Modal element found:', !!modal);
            if (modal) {
                modal.style.display = 'flex';
                // Initialize modal diagram
                modalZoom = 1.0;
                const zoomDisplay = document.getElementById('zoomLevel');
                if (zoomDisplay) {
                    zoomDisplay.textContent = '100%';
                }
                const modalWrapper = document.getElementById('modalDiagramWrapper');
                if (modalWrapper) {
                    modalWrapper.style.transform = 'scale(1)';
                    modalWrapper.style.transformOrigin = 'center center';
                }
                
                // Re-initialize Mermaid for the modal diagram
                setTimeout(() => {
                    try {
                        mermaid.init(undefined, "#modalMermaid");
                        console.log('✅ Mermaid re-initialized for modal');
                    } catch (error) {
                        console.error('❌ Mermaid init error:', error);
                    }
                }, 100);
                
                // Add event listeners for enhanced functionality
                addModalEventListeners();
                console.log('✅ Fullscreen modal opened');
            } else {
                console.error('❌ Modal element not found');
            }
        }

        function closeFullscreen() {
            console.log('🚪 closeFullscreen called');
            const modal = document.getElementById('diagramModal');
            if (modal) {
                modal.style.display = 'none';
                // Remove event listeners
                removeModalEventListeners();
                console.log('✅ Fullscreen modal closed');
            }
        }
        
        // Enhanced modal functionality
        function addModalEventListeners() {
            console.log('🎧 Adding modal event listeners');
            // ESC key to close
            document.addEventListener('keydown', handleModalKeydown);
            
            // Click outside to close
            const modal = document.getElementById('diagramModal');
            if (modal) {
                modal.addEventListener('click', handleModalOutsideClick);
            }
            
            // Mouse wheel zoom
            const modalContainer = document.querySelector('.modal-diagram-container');
            if (modalContainer) {
                modalContainer.addEventListener('wheel', handleModalWheel);
            }
        }
        
        function removeModalEventListeners() {
            console.log('🎧 Removing modal event listeners');
            document.removeEventListener('keydown', handleModalKeydown);
            const modal = document.getElementById('diagramModal');
            if (modal) {
                modal.removeEventListener('click', handleModalOutsideClick);
            }
            const modalContainer = document.querySelector('.modal-diagram-container');
            if (modalContainer) {
                modalContainer.removeEventListener('wheel', handleModalWheel);
            }
        }
        
        function handleModalKeydown(event) {
            console.log('⌨️ Modal keydown:', event.key);
            if (event.key === 'Escape') {
                closeFullscreen();
            } else if (event.key === '+' || event.key === '=') {
                modalZoomIn();
            } else if (event.key === '-') {
                modalZoomOut();
            } else if (event.key === '0') {
                modalResetZoom();
            }
        }
        
        function handleModalOutsideClick(event) {
            if (event.target.id === 'diagramModal') {
                console.log('🖱️ Clicked outside modal, closing');
                closeFullscreen();
            }
        }
        
        function handleModalWheel(event) {
            console.log('🖱️ Modal wheel event:', event.deltaY);
            event.preventDefault();
            if (event.deltaY < 0) {
                modalZoomIn();
            } else {
                modalZoomOut();
            }
        }

        // Modal zoom functions
        function modalZoomIn() {
            console.log('🔍 modalZoomIn called, modalZoom:', modalZoom);
            const wrapper = document.getElementById('modalDiagramWrapper');
            if (wrapper) {
                if (modalZoom < 3.0) {
                    modalZoom += 0.2;
                    wrapper.style.transform = 'scale(' + modalZoom + ')';
                    updateModalZoomDisplay();
                    console.log('✅ Modal zoomed in to:', modalZoom);
                }
            } else {
                console.error('❌ Modal wrapper not found');
            }
        }

        function modalZoomOut() {
            console.log('🔍 modalZoomOut called, modalZoom:', modalZoom);
            const wrapper = document.getElementById('modalDiagramWrapper');
            if (wrapper) {
                if (modalZoom > 0.5) {
                    modalZoom -= 0.2;
                    wrapper.style.transform = 'scale(' + modalZoom + ')';
                    updateModalZoomDisplay();
                    console.log('✅ Modal zoomed out to:', modalZoom);
                }
            } else {
                console.error('❌ Modal wrapper not found');
            }
        }

        function modalResetZoom() {
            console.log('🔄 modalResetZoom called');
            const wrapper = document.getElementById('modalDiagramWrapper');
            if (wrapper) {
                modalZoom = 1.0;
                wrapper.style.transform = 'scale(1)';
                updateModalZoomDisplay();
                console.log('✅ Modal zoom reset');
            }
        }
        
        function updateModalZoomDisplay() {
            const zoomDisplay = document.getElementById('zoomLevel');
            if (zoomDisplay) {
                zoomDisplay.textContent = Math.round(modalZoom * 100) + '%';
            }
        }
        
        // Enhanced navigation function with better error handling
        function navigate(filePath, lineNumber) {
            console.log('🔍 DEBUG: Navigate function called');
            console.log('   📂 filePath:', filePath, '(type:', typeof filePath, ')');
            console.log('   📍 lineNumber:', lineNumber, '(type:', typeof lineNumber, ')');
            
            // Ensure we have valid parameters
            if (!filePath || !lineNumber) {
                console.error('Invalid navigation parameters:', { filePath, lineNumber });
                alert('Navigation Error: Missing file path or line number');
                return;
            }
            
            // Send message to VS Code with proper error handling
            try {
                const navigationData = {
                    command: 'navigate',
                    filePath: filePath.toString(),
                    lineNumber: parseInt(lineNumber, 10)
                };
                console.log('📤 Sending navigation message:', navigationData);
                
                vscode.postMessage({
                    command: 'navigate',
                    filePath: filePath.toString(),
                    lineNumber: parseInt(lineNumber, 10)
                });
            } catch (error) {
                console.error('Error sending navigation message:', error);
                alert('Navigation Error: ' + error.message);
            }
        }
        
        // File opening function
        function openFile(filePath) {
            vscode.postMessage({
                command: 'openFile',
                filePath: filePath
            });
        }
         
        // Test function to verify JavaScript is working
        function testFunction() {
            console.log('🧪 Test function called - JavaScript is working!');
            alert('JavaScript is working! Zoom functions should work now.');
        }
         
        // Initialize after page load
        document.addEventListener('DOMContentLoaded', function() {
            console.log('📄 DOM Content Loaded');
            console.log('🔧 Available functions:', {
                zoomIn: typeof zoomIn,
                zoomOut: typeof zoomOut,
                resetZoom: typeof resetZoom,
                openFullscreen: typeof openFullscreen
            });
        });
         
        // Make functions globally available
        window.zoomIn = zoomIn;
        window.zoomOut = zoomOut;
        window.resetZoom = resetZoom;
        window.openFullscreen = openFullscreen;
        window.closeFullscreen = closeFullscreen;
        window.modalZoomIn = modalZoomIn;
        window.modalZoomOut = modalZoomOut;
        window.modalResetZoom = modalResetZoom;
        window.testFunction = testFunction;
        window.navigate = navigate;
        window.openFile = openFile;
         
        console.log('🌍 Functions attached to window object');
    </script>
</body>
</html>`;
    }

    // Register commands with VS Code
    context.subscriptions.push(
        generateCommand,
        navigateCommand
    );

    // Show welcome message on first activation
    vscode.window.showInformationMessage(
        '🚀 AI-Powered API Journey Builder is ready! Right-click on any function to analyze.'
    );
}

export function deactivate() {
    console.log('🚀 AI-Powered API Journey Builder extension is now deactivated');
}
