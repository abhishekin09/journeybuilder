import * as vscode from 'vscode';
import { AIService } from '../services/aiService';
import { JourneyResult } from '../types';

export class ApiJourneyProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'apiJourneyBuilder';
    
    private _view?: vscode.WebviewView;
    private _currentResult?: JourneyResult;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _aiService: AIService
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getInitialHtml(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'analyze':
                        this.generateJourney(message.functionName);
                        break;
                    case 'clear':
                        this._currentResult = undefined;
                        this._updateWebview();
                        break;
                }
            },
            undefined,
            []
        );
    }

    public async generateJourney(functionName: string): Promise<void> {
        if (!this._view) {
            return;
        }

        // Show loading state
        this._view.webview.postMessage({
            command: 'showLoading',
            functionName: functionName
        });

        try {
            // Analyze the function
            const result = await this._aiService.analyzeFunction(functionName);
            this._currentResult = result;

            // Update the webview with results
            this._view.webview.postMessage({
                command: 'showResult',
                result: result
            });

        } catch (error) {
            this._view.webview.postMessage({
                command: 'showError',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    private _updateWebview() {
        if (!this._view) {
            return;
        }

        this._view.webview.html = this._getInitialHtml(this._view.webview);
    }

    private _getInitialHtml(webview: vscode.Webview): string {
        // Get the local path to main script run in the webview
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css'));

        // Use a nonce to whitelist which scripts can be run
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
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
