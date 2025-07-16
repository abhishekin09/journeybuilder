export interface JourneyResult {
    functionName: string;
    diagram: string;
    writeup: string;
    error?: string;
}

export interface FunctionAnalysis {
    functionName: string;
    filePath: string;
    callers: string[];
    callees: string[];
    apiEndpoints: string[];
    databaseInteractions: string[];
    cacheInteractions: string[];
    messageQueueInteractions: string[];
}

export interface AIAnalysisRequest {
    functionName: string;
    workspacePath: string;
}

export interface AIAnalysisResponse {
    success: boolean;
    data?: JourneyResult;
    error?: string;
}
