import * as vscode from 'vscode';
import { ApiJourneyProvider } from './providers/apiJourneyProvider';
import { AIService } from './services/aiService';

export function activate(context: vscode.ExtensionContext) {
    console.log('API Journey Builder extension is now active!');

    // Initialize services
    const aiService = new AIService();
    let apiJourneyPanel: vscode.WebviewPanel | undefined;

    // Register the generate command (right-click context menu)
    const generateCommand = vscode.commands.registerCommand('apiJourneyBuilder.generate', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const selection = editor.selection;
        let functionName: string;

        if (selection.isEmpty) {
            // If no selection, try to get the word at cursor position
            const wordRange = editor.document.getWordRangeAtPosition(selection.active);
            if (wordRange) {
                functionName = editor.document.getText(wordRange);
            } else {
                vscode.window.showErrorMessage('Please select a function name or place cursor on a function');
                return;
            }
        } else {
            functionName = editor.document.getText(selection);
        }

        if (!functionName.trim()) {
            vscode.window.showErrorMessage('Please select a valid function name');
            return;
        }

        // Show progress notification
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Analyzing ${functionName}...`,
            cancellable: false
        }, async (progress) => {
            try {
                // Analyze the function
                const result = await aiService.analyzeFunction(functionName.trim());

                // Create a new untitled file and show the writeup
                const doc = await vscode.workspace.openTextDocument({
                    content: result.writeup,
                    language: 'markdown'
                });

                await vscode.window.showTextDocument(doc, vscode.ViewColumn.Two);
                
                vscode.window.showInformationMessage(`API Journey generated for ${functionName}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to generate API journey: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    });

    // The openPanel command is no longer needed as we are not using a webview panel
    // const openPanelCommand = vscode.commands.registerCommand('apiJourneyBuilder.openPanel', () => { ... });
    
    function createWebviewPanel(extensionUri: vscode.Uri): vscode.WebviewPanel {
        const panel = vscode.window.createWebviewPanel(
            'apiJourneyBuilder',
            '🕵️‍♂️ API Journey Builder',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri]
            }
        );
        
        // Set webview content
        panel.webview.html = getWebviewContent(panel.webview, extensionUri);
        
        // Handle messages from webview
        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'analyze':
                    try {
                        panel.webview.postMessage({
                            command: 'showLoading',
                            functionName: message.functionName
                        });
                        
                        const result = await aiService.analyzeFunction(message.functionName);
                        
                        panel.webview.postMessage({
                            command: 'showResult',
                            result: result
                        });
                    } catch (error) {
                        panel.webview.postMessage({
                            command: 'showError',
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });
                    }
                    break;
            }
        });
        
        // Clean up when panel is disposed
        panel.onDidDispose(() => {
            apiJourneyPanel = undefined;
        });
        
        return panel;
    }
    
    function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'main.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'style.css'));
        
        const nonce = getNonce();
        
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net;">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleUri}" rel="stylesheet">
            <title>API Journey Builder</title>
        </head>
        <body>
            <div class="container">
                <header>
                    <h1>🕵️‍♂️ API Journey Builder</h1>
                    <p>Analyze function dependencies and execution flow</p>
                </header>

                <div class="search-section">
                    <div class="input-group">
                        <input type="text" id="functionInput" placeholder="Enter function name (e.g., processLiveChallenges)" />
                        <button id="analyzeBtn">Analyze</button>
                    </div>
                    <div class="recent-searches" id="recentSearches">
                        <h3>Recent Searches</h3>
                        <ul id="recentList"></ul>
                    </div>
                </div>

                <div class="loading-section" id="loadingSection" style="display: none;">
                    <div class="spinner"></div>
                    <p>Analyzing <span id="loadingFunction"></span>...</p>
                </div>

                <div class="error-section" id="errorSection" style="display: none;">
                    <div class="error-message" id="errorMessage"></div>
                    <button id="retryBtn">Retry</button>
                </div>

                <div class="results-section" id="resultsSection" style="display: none;">
                    <div class="results-header">
                        <h2 id="resultTitle"></h2>
                        <button id="clearBtn">Clear</button>
                    </div>
                    
                    <div class="tabs">
                        <button class="tab-button active" data-tab="diagram">📊 Diagram</button>
                        <button class="tab-button" data-tab="writeup">📝 Details</button>
                    </div>

                    <div class="tab-content">
                        <div id="diagramTab" class="tab-pane active">
                            <div id="diagramContainer"></div>
                        </div>
                        
                        <div id="writeupTab" class="tab-pane">
                            <div id="writeupContainer"></div>
                        </div>
                    </div>
                </div>
            </div>

            <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }
    
    function getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    context.subscriptions.push(generateCommand);
}

export function deactivate() {
    console.log('API Journey Builder extension is now deactivated');
}
