import * as vscode from 'vscode';
import * as path from 'path';
import { JourneyResult, FunctionAnalysis } from '../types';

export class AIService {
    private workspaceRoot: string;

    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    }

    async analyzeFunction(functionName: string): Promise<JourneyResult> {
        try {
            // First try to analyze from the active editor (faster and more reliable)
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const text = activeEditor.document.getText();
                const searchPattern = new RegExp(`function\\s+${functionName}\\s*\\(`, 'i');
                
                if (searchPattern.test(text)) {
                    // Function found in active file, analyze it directly
                    return this.analyzeFromActiveFile(functionName, activeEditor.document.fileName, text);
                }
            }

            // Fall back to workspace search
            const functionLocation = await this.findFunctionDefinition(functionName);
            if (!functionLocation) {
                return {
                    functionName,
                    diagram: '',
                    writeup: `# Function Not Found\n\n**Error:** Function '${functionName}' not found.\n\n**Tips:**\n1. Make sure the function is in the currently open file\n2. Open a workspace folder containing the function\n3. Check the function name spelling`,
                    error: `Function '${functionName}' not found`
                };
            }

            // Step 2: Analyze the function and its dependencies
            const analysis = await this.performFunctionAnalysis(functionName, functionLocation);

            // Step 3: Generate the journey result
            const result = await this.generateJourneyResult(analysis);

            return result;
        } catch (error) {
            return {
                functionName,
                diagram: '',
                writeup: `Error analyzing function: ${error}`,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private analyzeFromActiveFile(functionName: string, filePath: string, text: string): JourneyResult {
        // Perform analysis on the current file
        const analysis: FunctionAnalysis = {
            functionName,
            filePath,
            callers: [], // Can't find callers without full workspace search
            callees: this.extractCallees(text, functionName),
            apiEndpoints: this.extractApiEndpoints(text),
            databaseInteractions: this.extractDatabaseInteractions(text),
            cacheInteractions: this.extractCacheInteractions(text),
            messageQueueInteractions: this.extractMessageQueueInteractions(text)
        };

        // Generate Mermaid diagram
        const diagram = this.generateMermaidDiagram(analysis);
        
        // Generate detailed writeup  
        let writeup = `# API Journey for ${functionName}\n\n`;
        writeup += `**Location:** ${path.basename(filePath)}\n`;
        writeup += `**Analysis Scope:** Current file only\n\n`;
        
        if (analysis.callees.length > 0) {
            writeup += `## Functions Called (${analysis.callees.length})\n`;
            writeup += `This function calls:\n`;
            analysis.callees.forEach(callee => {
                writeup += `- ${callee}()\n`;
            });
            writeup += '\n';
        }
        
        if (analysis.apiEndpoints.length > 0) {
            writeup += `## API Endpoints (${analysis.apiEndpoints.length})\n`;
            writeup += `Associated with these endpoints:\n`;
            analysis.apiEndpoints.forEach(endpoint => {
                writeup += `- ${endpoint}\n`;
            });
            writeup += '\n';
        }
        
        if (analysis.databaseInteractions.length > 0) {
            writeup += `## Database Interactions (${analysis.databaseInteractions.length})\n`;
            writeup += `Database operations detected:\n`;
            analysis.databaseInteractions.forEach(interaction => {
                writeup += `- ${interaction}\n`;
            });
            writeup += '\n';
        }
        
        if (analysis.cacheInteractions.length > 0) {
            writeup += `## Cache Interactions (${analysis.cacheInteractions.length})\n`;
            writeup += `Cache operations detected:\n`;
            analysis.cacheInteractions.forEach(interaction => {
                writeup += `- ${interaction}\n`;
            });
            writeup += '\n';
        }
        
        if (analysis.messageQueueInteractions.length > 0) {
            writeup += `## Message Queue Interactions (${analysis.messageQueueInteractions.length})\n`;
            writeup += `Message queue operations detected:\n`;
            analysis.messageQueueInteractions.forEach(interaction => {
                writeup += `- ${interaction}\n`;
            });
            writeup += '\n';
        }

        return {
            functionName,
            diagram,
            writeup
        };
    }

    private async findFunctionDefinition(functionName: string): Promise<string | null> {
        // Use VS Code's built-in search to find the function
        const searchPattern = new RegExp(`(function\\s+${functionName}|${functionName}\\s*[=:]|class\\s+${functionName})`, 'i');
        
        const files = await vscode.workspace.findFiles('**/*.{ts,js,tsx,jsx}', '**/node_modules/**');
        
        for (const file of files) {
            const document = await vscode.workspace.openTextDocument(file);
            const text = document.getText();
            
            if (searchPattern.test(text)) {
                return file.fsPath;
            }
        }
        
        return null;
    }

    private async performFunctionAnalysis(functionName: string, filePath: string): Promise<FunctionAnalysis> {
        const document = await vscode.workspace.openTextDocument(filePath);
        const text = document.getText();
        
        // Basic analysis - in a real implementation, this would use AST parsing
        const analysis: FunctionAnalysis = {
            functionName,
            filePath,
            callers: await this.findCallers(functionName),
            callees: this.extractCallees(text, functionName),
            apiEndpoints: this.extractApiEndpoints(text),
            databaseInteractions: this.extractDatabaseInteractions(text),
            cacheInteractions: this.extractCacheInteractions(text),
            messageQueueInteractions: this.extractMessageQueueInteractions(text)
        };

        return analysis;
    }

    private async findCallers(functionName: string): Promise<string[]> {
        const callers: string[] = [];
        const files = await vscode.workspace.findFiles('**/*.{ts,js,tsx,jsx}', '**/node_modules/**');
        
        for (const file of files) {
            const document = await vscode.workspace.openTextDocument(file);
            const text = document.getText();
            
            // Simple regex to find function calls
            const callPattern = new RegExp(`${functionName}\\s*\\(`, 'g');
            if (callPattern.test(text)) {
                const relativePath = path.relative(this.workspaceRoot, file.fsPath);
                callers.push(relativePath);
            }
        }
        
        return callers;
    }

    private extractCallees(text: string, functionName: string): string[] {
        const callees: string[] = [];
        
        // Extract function calls within the function body
        const functionRegex = new RegExp(`(?:function\\s+${functionName}|${functionName}\\s*[=:])([\\s\\S]*?)(?=\\n\\s*(?:function|class|$))`, 'i');
        const functionMatch = text.match(functionRegex);
        
        if (functionMatch) {
            const functionBody = functionMatch[1];
            const callPattern = /(\w+)\s*\(/g;
            let match;
            
            while ((match = callPattern.exec(functionBody)) !== null) {
                const callee = match[1];
                if (callee !== functionName && !callees.includes(callee)) {
                    callees.push(callee);
                }
            }
        }
        
        return callees;
    }

    private extractApiEndpoints(text: string): string[] {
        const endpoints: string[] = [];
        
        // Look for common API patterns
        const patterns = [
            /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
            /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
            /\.route\s*\(\s*['"`]([^'"`]+)['"`]/g
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const endpoint = match[2] || match[1];
                if (!endpoints.includes(endpoint)) {
                    endpoints.push(endpoint);
                }
            }
        });
        
        return endpoints;
    }

    private extractDatabaseInteractions(text: string): string[] {
        const dbInteractions: string[] = [];
        
        // Look for common database patterns
        const patterns = [
            /\.dao\.\w+/g,
            /\.findOne\(/g,
            /\.find\(/g,
            /\.save\(/g,
            /\.update\(/g,
            /\.delete\(/g,
            /\.create\(/g,
            /\.insertOne\(/g,
            /\.updateOne\(/g,
            /\.deleteOne\(/g
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                if (!dbInteractions.includes(match[0])) {
                    dbInteractions.push(match[0]);
                }
            }
        });
        
        return dbInteractions;
    }

    private extractCacheInteractions(text: string): string[] {
        const cacheInteractions: string[] = [];
        
        // Look for cache patterns
        const patterns = [
            /redis\.\w+/g,
            /cache\.\w+/g,
            /\.get\s*\(/g,
            /\.set\s*\(/g,
            /\.del\s*\(/g
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                if (!cacheInteractions.includes(match[0])) {
                    cacheInteractions.push(match[0]);
                }
            }
        });
        
        return cacheInteractions;
    }

    private extractMessageQueueInteractions(text: string): string[] {
        const mqInteractions: string[] = [];
        
        // Look for message queue patterns
        const patterns = [
            /kafka\.\w+/g,
            /sqs\.\w+/g,
            /\.publish\(/g,
            /\.subscribe\(/g,
            /\.send\(/g,
            /\.receive\(/g,
            /\.consumer\./g,
            /\.producer\./g
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                if (!mqInteractions.includes(match[0])) {
                    mqInteractions.push(match[0]);
                }
            }
        });
        
        return mqInteractions;
    }

    private async generateJourneyResult(analysis: FunctionAnalysis): Promise<JourneyResult> {
        // Generate Mermaid diagram
        const diagram = this.generateMermaidDiagram(analysis);
        
        // Generate detailed writeup
        const writeup = this.generateWriteup(analysis);
        
        return {
            functionName: analysis.functionName,
            diagram,
            writeup        };
    }

    private generateMermaidDiagram(analysis: FunctionAnalysis): string {
        let diagram = 'graph TD\n';
        let nodeCounter = 1;
        
        // Add callers
        analysis.callers.forEach(caller => {
            diagram += `    A${nodeCounter}[${path.basename(caller)}] --> B[${analysis.functionName}]\n`;
            nodeCounter++;
        });
        
        // Add main function
        if (analysis.callers.length === 0) {
            diagram += `    A[Entry Point] --> B[${analysis.functionName}]\n`;
        }
        
        // Add callees
        analysis.callees.forEach(callee => {
            diagram += `    B --> C${nodeCounter}[${callee}]\n`;
            nodeCounter++;
        });
        
        // Add database interactions
        if (analysis.databaseInteractions.length > 0) {
            diagram += `    B --> D[(Database)]\n`;
        }
        
        // Add cache interactions
        if (analysis.cacheInteractions.length > 0) {
            diagram += `    B --> E[Cache/Redis]\n`;
        }
        
        // Add message queue interactions
        if (analysis.messageQueueInteractions.length > 0) {
            diagram += `    B --> F[Message Queue]\n`;
        }
        
        return diagram;
    }

    private generateWriteup(analysis: FunctionAnalysis): string {
        let writeup = `# API Journey for ${analysis.functionName}\n\n`;
        
        writeup += `**Location:** ${path.relative(this.workspaceRoot, analysis.filePath)}\n\n`;
        
        if (analysis.callers.length > 0) {
            writeup += `## Callers (${analysis.callers.length})\n`;
            writeup += `This function is called from:\n`;
            analysis.callers.forEach(caller => {
                writeup += `- ${path.basename(caller)}\n`;
            });
            writeup += '\n';
        }
        
        if (analysis.callees.length > 0) {
            writeup += `## Functions Called (${analysis.callees.length})\n`;
            writeup += `This function calls:\n`;
            analysis.callees.forEach(callee => {
                writeup += `- ${callee}()\n`;
            });
            writeup += '\n';
        }
        
        if (analysis.apiEndpoints.length > 0) {
            writeup += `## API Endpoints (${analysis.apiEndpoints.length})\n`;
            writeup += `Associated with these endpoints:\n`;
            analysis.apiEndpoints.forEach(endpoint => {
                writeup += `- ${endpoint}\n`;
            });
            writeup += '\n';
        }
        
        if (analysis.databaseInteractions.length > 0) {
            writeup += `## Database Interactions (${analysis.databaseInteractions.length})\n`;
            writeup += `Database operations detected:\n`;
            analysis.databaseInteractions.forEach(interaction => {
                writeup += `- ${interaction}\n`;
            });
            writeup += '\n';
        }
        
        if (analysis.cacheInteractions.length > 0) {
            writeup += `## Cache Interactions (${analysis.cacheInteractions.length})\n`;
            writeup += `Cache operations detected:\n`;
            analysis.cacheInteractions.forEach(interaction => {
                writeup += `- ${interaction}\n`;
            });
            writeup += '\n';
        }
        
        if (analysis.messageQueueInteractions.length > 0) {
            writeup += `## Message Queue Interactions (${analysis.messageQueueInteractions.length})\n`;
            writeup += `Message queue operations detected:\n`;
            analysis.messageQueueInteractions.forEach(interaction => {
                writeup += `- ${interaction}\n`;
            });
            writeup += '\n';
        }
        
        return writeup;
    }
}
