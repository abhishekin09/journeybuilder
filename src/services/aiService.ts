import * as vscode from 'vscode';
import * as path from 'path';
import OpenAI from 'openai';
import { 
    JourneyResult, 
    FunctionAnalysis, 
    UpstreamFunction, 
    DownstreamFunction, 
    CodeContext,
    APIEndpoint,
    DatabaseInteraction,
    CacheInteraction,
    MessageQueueInteraction
} from '../types';

export class AIService {
    private openai: OpenAI | null = null;
    private workspaceRoot: string;

    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        this.initializeOpenAI();
    }

    private initializeOpenAI() {
        // Hardcoded API key for development/testing
        const apiKey = '';
        
        apiKey
        console.log('🔧 Initializing OpenAI client...');
        this.openai = new OpenAI({
            apiKey: apiKey
        });
        console.log('✅ OpenAI client initialized successfully');
    }

    async analyzeFunction(functionName: string): Promise<JourneyResult> {
        console.log(`\n🚀 === STARTING AI ANALYSIS FOR: ${functionName} ===`);
        try {
            console.log(`🔍 Step 1: Finding function context for "${functionName}"`);

            // Get the current function's context
            const functionContext = await this.getFunctionContext(functionName);
            if (!functionContext) {
                console.log(`❌ Function "${functionName}" not found in workspace`);
                return {
                    functionName,
                    diagram: '',
                    writeup: this.generateErrorWriteup(`Function '${functionName}' not found in the current workspace.`),
                    upstream: [],
                    downstream: [],
                    error: `Function '${functionName}' not found`
                };
            }

            console.log(`✅ Found function in: ${functionContext.fileName}`);
            console.log(`📄 Function context gathered - Content length: ${functionContext.content.length} characters`);

            console.log(`🔍 Step 2: Gathering related files...`);
            // Gather related files for context
            const relatedFiles = await this.gatherRelatedFiles(functionContext);
            console.log(`✅ Found ${relatedFiles.length} related files`);
            relatedFiles.forEach(file => console.log(`   📁 ${file.fileName}`));

            console.log(`🤖 Step 3: Performing AI analysis via OpenAI...`);
            // Perform AI analysis
            const analysis = await this.performAIAnalysis(functionContext, relatedFiles);
            console.log(`✅ AI analysis completed successfully`);

            console.log(`📝 Step 4: Generating final result...`);
            // Generate the final result
            const result = await this.generateJourneyResult(analysis);
            console.log(`✅ === AI ANALYSIS COMPLETED FOR: ${functionName} ===\n`);

            return result;
        } catch (error) {
            console.error(`❌ === AI ANALYSIS FAILED FOR: ${functionName} ===`);
            console.error('Error details:', error);
            return {
                functionName,
                diagram: '',
                writeup: this.generateErrorWriteup(`Error analyzing function: ${error instanceof Error ? error.message : 'Unknown error'}`),
                upstream: [],
                downstream: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private async getFunctionContext(functionName: string): Promise<CodeContext | null> {
        // First try the active editor
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const text = activeEditor.document.getText();
            const functionRegex = new RegExp(
                `(?:function\\s+${functionName}|${functionName}\\s*[=:]|class\\s+${functionName}|export\\s+(?:function\\s+)?${functionName})`,
                'i'
            );
            
            if (functionRegex.test(text)) {
                return {
                    fileName: path.basename(activeEditor.document.fileName),
                    filePath: activeEditor.document.fileName,
                    content: text,
                    language: activeEditor.document.languageId
                };
            }
        }

        // Search workspace
        const files = await vscode.workspace.findFiles('**/*.{ts,js,tsx,jsx}', '**/node_modules/**');
        
        for (const file of files) {
            const document = await vscode.workspace.openTextDocument(file);
            const text = document.getText();
            
            const functionRegex = new RegExp(
                `(?:function\\s+${functionName}|${functionName}\\s*[=:]|class\\s+${functionName}|export\\s+(?:function\\s+)?${functionName})`,
                'i'
            );
            
            if (functionRegex.test(text)) {
                return {
                    fileName: path.basename(file.fsPath),
                    filePath: file.fsPath,
                    content: text,
                    language: document.languageId
                };
            }
        }

        return null;
    }

    private async gatherRelatedFiles(functionContext: CodeContext): Promise<CodeContext[]> {
        const config = vscode.workspace.getConfiguration('apiJourneyBuilder');
        const maxFiles = config.get<number>('maxContextFiles') || 10;
        
        const relatedFiles: CodeContext[] = [];
        const files = await vscode.workspace.findFiles('**/*.{ts,js,tsx,jsx}', '**/node_modules/**');
        
        // Find files that might be related to the function
        for (const file of files.slice(0, maxFiles)) {
            if (file.fsPath === functionContext.filePath) continue;
            
            try {
                const document = await vscode.workspace.openTextDocument(file);
                const text = document.getText();
                
                // Check if this file imports or calls the function
                if (text.includes(functionContext.fileName.replace(/\.(ts|js|tsx|jsx)$/, '')) ||
                    text.includes(path.basename(functionContext.fileName, path.extname(functionContext.fileName)))) {
                    
                    relatedFiles.push({
                        fileName: path.basename(file.fsPath),
                        filePath: file.fsPath,
                        content: text,
                        language: document.languageId
                    });
                }
            } catch (error) {
                // Skip files that can't be read
                continue;
            }
        }

        return relatedFiles.slice(0, maxFiles);
    }

    private async performAIAnalysis(functionContext: CodeContext, relatedFiles: CodeContext[]): Promise<FunctionAnalysis> {
        const config = vscode.workspace.getConfiguration('apiJourneyBuilder');
        const model = config.get<string>('openaiModel') || 'gpt-4-turbo-preview';
        
        console.log(`🤖 OpenAI Analysis Details:`);
        console.log(`   🎯 Model: ${model}`);
        console.log(`   📊 Function Context: ${functionContext.fileName} (${functionContext.content.length} chars)`);
        console.log(`   📚 Related Files: ${relatedFiles.length}`);

        const systemPrompt = `You are an expert code analyzer. Analyze the given function and its context to provide detailed insights about:

1. UPSTREAM FUNCTIONS: Functions that call the target function (with file names and line numbers)
2. DOWNSTREAM FUNCTIONS: Functions called by the target function (with their purpose and complexity)
3. API ENDPOINTS: REST endpoints associated with this function
4. DATABASE INTERACTIONS: Database operations performed
5. CACHE INTERACTIONS: Cache operations performed
6. MESSAGE QUEUE INTERACTIONS: Message queue operations performed

Return your analysis in JSON format following this exact structure:
{
  "functionName": "string",
  "filePath": "string", 
  "lineNumber": number,
  "functionCode": "string",
  "upstream": [
    {
      "functionName": "string",
      "filePath": "string", 
      "lineNumber": number,
      "context": "string",
      "purpose": "string"
    }
  ],
  "downstream": [
    {
      "functionName": "string",
      "filePath": "string",
      "lineNumber": number,
      "purpose": "string",
      "parameters": ["string"],
      "returnType": "string",
      "complexity": "low|medium|high"
    }
  ],
  "apiEndpoints": [
    {
      "method": "string",
      "path": "string", 
      "purpose": "string",
      "lineNumber": number
    }
  ],
  "databaseInteractions": [
    {
      "operation": "string",
      "table": "string",
      "query": "string",
      "purpose": "string",
      "lineNumber": number
    }
  ],
  "cacheInteractions": [
    {
      "operation": "string",
      "key": "string",
      "purpose": "string", 
      "lineNumber": number
    }
  ],
  "messageQueueInteractions": [
    {
      "operation": "string",
      "queue": "string",
      "message": "string",
      "purpose": "string",
      "lineNumber": number
    }
  ]
}

Be thorough and accurate with line numbers. Analyze the actual code flow and dependencies.`;

        const userPrompt = `TARGET FUNCTION CONTEXT:
File: ${functionContext.fileName}
Path: ${functionContext.filePath}
Language: ${functionContext.language}

CONTENT:
${functionContext.content}

RELATED FILES:
${relatedFiles.map(file => `
=== ${file.fileName} ===
${file.content}
`).join('\n')}

Please analyze the target function and provide comprehensive upstream/downstream analysis.`;

        console.log(`📤 Sending request to OpenAI...`);
        console.log(`   📏 System prompt: ${systemPrompt.length} characters`);
        console.log(`   📏 User prompt: ${userPrompt.length} characters`);
        console.log(`   ⏰ Request timestamp: ${new Date().toISOString()}`);

        try {
            const response = await this.openai!.chat.completions.create({
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.1,
                max_tokens: 4000
            });

            console.log(`📥 ✅ OpenAI API Response received successfully!`);
            console.log(`   ⏰ Response timestamp: ${new Date().toISOString()}`);
            console.log(`   🧠 Model used: ${response.model || 'unknown'}`);
            console.log(`   🔢 Completion tokens: ${response.usage?.completion_tokens || 'unknown'}`);
            console.log(`   🔢 Prompt tokens: ${response.usage?.prompt_tokens || 'unknown'}`);
            console.log(`   🔢 Total tokens: ${response.usage?.total_tokens || 'unknown'}`);

            const analysisResult = response.choices[0]?.message?.content;
            if (!analysisResult) {
                console.error(`❌ No content in OpenAI response`);
                throw new Error('No response from OpenAI');
            }

            console.log(`📄 Response content length: ${analysisResult.length} characters`);
            console.log(`📝 Response preview: ${analysisResult.substring(0, 200)}...`);

            // Parse JSON response
            console.log(`🔍 Parsing JSON response...`);
            const jsonMatch = analysisResult.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.error(`❌ No valid JSON found in response`);
                console.error(`Full response:`, analysisResult);
                throw new Error('Invalid JSON response from AI');
            }

            console.log(`✅ JSON found, parsing...`);
            const parsedAnalysis = JSON.parse(jsonMatch[0]);
            
            console.log(`✅ JSON parsed successfully!`);
            console.log(`   🔍 Found ${parsedAnalysis.upstream?.length || 0} upstream functions`);
            console.log(`   🔍 Found ${parsedAnalysis.downstream?.length || 0} downstream functions`);
            console.log(`   🔍 Found ${parsedAnalysis.apiEndpoints?.length || 0} API endpoints`);
            console.log(`   🔍 Found ${parsedAnalysis.databaseInteractions?.length || 0} database interactions`);

            // Add clickable links to upstream and downstream functions
            console.log(`🔗 Adding clickable links to functions...`);
            parsedAnalysis.upstream = parsedAnalysis.upstream.map((func: any) => ({
                ...func,
                clickableLink: this.generateClickableLink(func.filePath, func.lineNumber)
            }));

            parsedAnalysis.downstream = parsedAnalysis.downstream.map((func: any) => ({
                ...func,
                clickableLink: this.generateClickableLink(func.filePath, func.lineNumber)
            }));

            console.log(`✅ Clickable links added successfully`);
            return parsedAnalysis;
        } catch (error) {
            console.error(`❌ OpenAI API Error occurred:`, error);
            if (error instanceof Error) {
                console.error(`   Error name: ${error.name}`);
                console.error(`   Error message: ${error.message}`);
                console.error(`   Error stack: ${error.stack}`);
            }
            throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private generateClickableLink(filePath: string, lineNumber: number): string {
        const relativePath = path.relative(this.workspaceRoot, filePath);
        return `command:vscode.open?${encodeURIComponent(JSON.stringify([vscode.Uri.file(filePath), { selection: new vscode.Range(lineNumber - 1, 0, lineNumber - 1, 0) }]))}`;
    }

    private async generateJourneyResult(analysis: FunctionAnalysis): Promise<JourneyResult> {
        // Generate Mermaid diagram
        const diagram = this.generateMermaidDiagram(analysis);
        
        // Generate detailed writeup
        const writeup = this.generateAIWriteup(analysis);
        
        return {
            functionName: analysis.functionName,
            diagram,
            writeup,
            upstream: analysis.upstream,
            downstream: analysis.downstream
        };
    }

    private generateMermaidDiagram(analysis: FunctionAnalysis): string {
        let diagram = 'graph TD\n';
        let nodeCounter = 1;
        
        // Add upstream functions
        analysis.upstream.forEach(upstream => {
            diagram += `    U${nodeCounter}["${upstream.functionName}<br/>${path.basename(upstream.filePath)}:${upstream.lineNumber}"] --> MAIN["${analysis.functionName}<br/>TARGET"]\n`;
            nodeCounter++;
        });
        
        // Add main function if no upstream
        if (analysis.upstream.length === 0) {
            diagram += `    START[Entry Point] --> MAIN["${analysis.functionName}<br/>TARGET"]\n`;
        }
        
        // Add downstream functions  
        analysis.downstream.forEach(downstream => {
            const complexityColor = downstream.complexity === 'high' ? 'fill:#ffcccc' : 
                                   downstream.complexity === 'medium' ? 'fill:#ffffcc' : 'fill:#ccffcc';
            diagram += `    MAIN --> D${nodeCounter}["${downstream.functionName}<br/>${path.basename(downstream.filePath)}:${downstream.lineNumber}"]\n`;
            diagram += `    D${nodeCounter} --> D${nodeCounter}Purpose["${downstream.purpose}"]\n`;
            diagram += `    classDef complexity${nodeCounter} ${complexityColor}\n`;
            diagram += `    class D${nodeCounter} complexity${nodeCounter}\n`;
            nodeCounter++;
        });
        
        // Add API endpoints
        if (analysis.apiEndpoints.length > 0) {
            diagram += `    MAIN --> API[API Endpoints]\n`;
            analysis.apiEndpoints.forEach(endpoint => {
                diagram += `    API --> API${nodeCounter}["${endpoint.method} ${endpoint.path}"]\n`;
                nodeCounter++;
            });
        }
        
        // Add database interactions
        if (analysis.databaseInteractions.length > 0) {
            diagram += `    MAIN --> DB[(Database)]\n`;
            analysis.databaseInteractions.forEach(db => {
                diagram += `    DB --> DB${nodeCounter}["${db.operation}${db.table ? ': ' + db.table : ''}"]\n`;
                nodeCounter++;
            });
        }
        
        // Add cache interactions
        if (analysis.cacheInteractions.length > 0) {
            diagram += `    MAIN --> CACHE[Cache/Redis]\n`;
        }
        
        // Add message queue interactions
        if (analysis.messageQueueInteractions.length > 0) {
            diagram += `    MAIN --> MQ[Message Queue]\n`;
        }
        
        return diagram;
    }

    private generateAIWriteup(analysis: FunctionAnalysis): string {
        let writeup = `# 🚀 AI-Powered Journey Analysis: ${analysis.functionName}\n\n`;
        
        writeup += `**📁 Location:** ${path.relative(this.workspaceRoot, analysis.filePath)}:${analysis.lineNumber}\n`;
        writeup += `**🔍 Analysis:** AI-powered comprehensive code analysis\n\n`;
        
        // Upstream Analysis
        writeup += `## ⬆️ UPSTREAM ANALYSIS (${analysis.upstream.length} callers)\n\n`;
        if (analysis.upstream.length > 0) {
            writeup += `Functions that call **${analysis.functionName}**:\n\n`;
            analysis.upstream.forEach((upstream, index) => {
                writeup += `### ${index + 1}. ${upstream.functionName}\n`;
                writeup += `- **📂 File:** ${path.basename(upstream.filePath)}:${upstream.lineNumber}\n`;
                writeup += `- **🎯 Purpose:** ${upstream.purpose}\n`;
                writeup += `- **📝 Context:** ${upstream.context}\n`;
                writeup += `- **🔗 [Go to function](${upstream.clickableLink})**\n\n`;
            });
        } else {
            writeup += `No upstream callers found. This function might be:\n`;
            writeup += `- An entry point (API endpoint, event handler)\n`;
            writeup += `- Called dynamically or through dependency injection\n`;
            writeup += `- A utility function used conditionally\n\n`;
        }
        
        // Downstream Analysis  
        writeup += `## ⬇️ DOWNSTREAM ANALYSIS (${analysis.downstream.length} callees)\n\n`;
        if (analysis.downstream.length > 0) {
            writeup += `Functions called by **${analysis.functionName}**:\n\n`;
            analysis.downstream.forEach((downstream, index) => {
                const complexityEmoji = downstream.complexity === 'high' ? '🔴' : 
                                       downstream.complexity === 'medium' ? '🟡' : '🟢';
                writeup += `### ${index + 1}. ${downstream.functionName} ${complexityEmoji}\n`;
                writeup += `- **📂 File:** ${path.basename(downstream.filePath)}:${downstream.lineNumber}\n`;
                writeup += `- **🎯 Purpose:** ${downstream.purpose}\n`;
                writeup += `- **⚡ Complexity:** ${downstream.complexity.toUpperCase()}\n`;
                if (downstream.parameters && downstream.parameters.length > 0) {
                    writeup += `- **📥 Parameters:** ${downstream.parameters.join(', ')}\n`;
                }
                if (downstream.returnType) {
                    writeup += `- **📤 Returns:** ${downstream.returnType}\n`;
                }
                writeup += `- **🔗 [Go to function](${downstream.clickableLink})**\n\n`;
            });
        } else {
            writeup += `No downstream function calls detected. This function might be:\n`;
            writeup += `- A leaf function (performs direct operations)\n`;
            writeup += `- Using external libraries or built-in functions only\n`;
            writeup += `- A simple utility or getter function\n\n`;
        }
        
        // API Endpoints
        if (analysis.apiEndpoints.length > 0) {
            writeup += `## 🌐 API ENDPOINTS (${analysis.apiEndpoints.length})\n\n`;
            analysis.apiEndpoints.forEach((endpoint, index) => {
                writeup += `### ${index + 1}. ${endpoint.method.toUpperCase()} ${endpoint.path}\n`;
                writeup += `- **🎯 Purpose:** ${endpoint.purpose}\n`;
                writeup += `- **📍 Line:** ${endpoint.lineNumber}\n\n`;
            });
        }
        
        // Database Interactions
        if (analysis.databaseInteractions.length > 0) {
            writeup += `## 🗄️ DATABASE INTERACTIONS (${analysis.databaseInteractions.length})\n\n`;
            analysis.databaseInteractions.forEach((db, index) => {
                writeup += `### ${index + 1}. ${db.operation.toUpperCase()}\n`;
                writeup += `- **🎯 Purpose:** ${db.purpose}\n`;
                if (db.table) writeup += `- **📋 Table:** ${db.table}\n`;
                if (db.query) writeup += `- **💾 Query:** \`${db.query}\`\n`;
                writeup += `- **📍 Line:** ${db.lineNumber}\n\n`;
            });
        }
        
        // Cache Interactions
        if (analysis.cacheInteractions.length > 0) {
            writeup += `## ⚡ CACHE INTERACTIONS (${analysis.cacheInteractions.length})\n\n`;
            analysis.cacheInteractions.forEach((cache, index) => {
                writeup += `### ${index + 1}. ${cache.operation.toUpperCase()}\n`;
                writeup += `- **🎯 Purpose:** ${cache.purpose}\n`;
                if (cache.key) writeup += `- **🔑 Key:** ${cache.key}\n`;
                writeup += `- **📍 Line:** ${cache.lineNumber}\n\n`;
            });
        }
        
        // Message Queue Interactions
        if (analysis.messageQueueInteractions.length > 0) {
            writeup += `## 📨 MESSAGE QUEUE INTERACTIONS (${analysis.messageQueueInteractions.length})\n\n`;
            analysis.messageQueueInteractions.forEach((mq, index) => {
                writeup += `### ${index + 1}. ${mq.operation.toUpperCase()}\n`;
                writeup += `- **🎯 Purpose:** ${mq.purpose}\n`;
                if (mq.queue) writeup += `- **📬 Queue:** ${mq.queue}\n`;
                if (mq.message) writeup += `- **💬 Message:** ${mq.message}\n`;
                writeup += `- **📍 Line:** ${mq.lineNumber}\n\n`;
            });
        }
        
        writeup += `## 🎯 ANALYSIS SUMMARY\n\n`;
        writeup += `This AI-powered analysis provides comprehensive insights into the **${analysis.functionName}** function, including:\n\n`;
        writeup += `- **🔍 Upstream Dependencies:** ${analysis.upstream.length} functions that call this function\n`;
        writeup += `- **📊 Downstream Flow:** ${analysis.downstream.length} functions called by this function\n`;
        writeup += `- **🌐 External Integrations:** ${analysis.apiEndpoints.length + analysis.databaseInteractions.length + analysis.cacheInteractions.length + analysis.messageQueueInteractions.length} external interactions\n\n`;
        writeup += `*Click the links above to navigate directly to function definitions in your code.*\n`;
        
        return writeup;
    }

    private generateErrorWriteup(errorMessage: string): string {
        return `# ❌ Analysis Error\n\n**Error:** ${errorMessage}\n\n## Setup Instructions\n\n1. **Configure OpenAI API Key:**\n   - Go to VS Code Settings (Cmd/Ctrl + ,)\n   - Search for "API Journey Builder"\n   - Enter your OpenAI API key\n   - Get a key at: https://platform.openai.com/api-keys\n\n2. **Ensure Function is Accessible:**\n   - Make sure the function exists in your workspace\n   - Try selecting the function name before right-clicking\n   - Open the file containing the function\n\n3. **Check File Types:**\n   - Supports: .ts, .js, .tsx, .jsx files\n   - Make sure you're working with supported file types\n\n## Troubleshooting\n\n- **API Key Issues:** Verify your OpenAI API key is valid and has credits\n- **Function Not Found:** Make sure the function name is spelled correctly\n- **Large Codebases:** The analysis works best with focused workspaces\n\nFor support, please check the extension documentation.`;
    }
}
