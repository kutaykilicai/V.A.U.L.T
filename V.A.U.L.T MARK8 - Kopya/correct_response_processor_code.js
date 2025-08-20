// Correct code for Final Response Processor node

// Execute for each item
const item = $item(0);

// Get the execution results
const finalResponse = {
  success: item.executionResult?.status === 'error' ? false : true,
  executionId: item.executionId,
  agent: item.executionResult?.agent || 'unknown',
  command: item.executionResult?.originalCommand || item.command,
  language: item.executionResult?.detectedLanguage || 'unknown',
  confidence: item.executionResult?.confidence || 0,
  status: item.executionResult?.status || 'completed',
  execution: {
    estimatedTime: item.executionResult?.estimatedTime || 'N/A',
    actualTime: Date.now() - (item.timestamp || Date.now()),
    requirements: item.executionResult?.requirements || [],
    safety: item.executionResult?.safety || 'verified'
  },
  response: {
    type: item.executionResult?.responseType || 'agent_response',
    message: item.executionResult?.message || item.message || 'Command processed',
    data: item.executionResult?.data || item.data || {}
  },
  context: {
    sessionId: item.sessionId || 'default',
    userId: item.userId || 'anonymous',
    previousCommand: item.previousCommand || null
  },
  metadata: {
    processingTime: `${Date.now() - (item.timestamp || Date.now())}ms`,
    workflowExecutionId: $execution.id,
    timestamp: new Date().toISOString(),
    version: 'MK8'
  }
};

// Return the properly formatted response
return finalResponse;
