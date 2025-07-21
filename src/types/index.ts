export interface JourneyResult {
    functionName: string;
    diagram: string;
    writeup: string;
    upstream: UpstreamFunction[];
    downstream: DownstreamFunction[];
    error?: string;
}

export interface UpstreamFunction {
    functionName: string;
    filePath: string;
    lineNumber: number;
    context: string;
    purpose: string;
    clickableLink: string;
}

export interface DownstreamFunction {
    functionName: string;
    filePath: string;
    lineNumber: number;
    purpose: string;
    parameters?: string[];
    returnType?: string;
    complexity: 'low' | 'medium' | 'high';
    clickableLink: string;
}

export interface FunctionAnalysis {
    functionName: string;
    filePath: string;
    lineNumber: number;
    functionCode: string;
    upstream: UpstreamFunction[];
    downstream: DownstreamFunction[];
    apiEndpoints: APIEndpoint[];
    databaseInteractions: DatabaseInteraction[];
    cacheInteractions: CacheInteraction[];
    messageQueueInteractions: MessageQueueInteraction[];
}

export interface APIEndpoint {
    method: string;
    path: string;
    purpose: string;
    lineNumber: number;
}

export interface DatabaseInteraction {
    operation: string;
    table?: string;
    query?: string;
    purpose: string;
    lineNumber: number;
}

export interface CacheInteraction {
    operation: string;
    key?: string;
    purpose: string;
    lineNumber: number;
}

export interface MessageQueueInteraction {
    operation: string;
    queue?: string;
    message?: string;
    purpose: string;
    lineNumber: number;
}

export interface CodeContext {
    fileName: string;
    filePath: string;
    content: string;
    language: string;
}

export interface AIAnalysisRequest {
    functionName: string;
    functionCode: string;
    fileContext: CodeContext;
    workspaceFiles: CodeContext[];
}

export interface AIAnalysisResponse {
    success: boolean;
    data?: JourneyResult;
    error?: string;
}
