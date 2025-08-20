// VAULT MK8 - Fixed Final Response Processor
// Bu kodu n8n'de "✅ Final Response Processor" node'una kopyalayın

const allData = $input.all();
const executionResult = allData[0]?.json;

if (!executionResult) {
  return [{
    success: false,
    error: 'No execution result received',
    timestamp: new Date().toISOString()
  }];
}

// Process execution result
const finalResponse = {
  success: executionResult.status !== 'error' && executionResult.status !== 'blocked',
  executionId: executionResult.executionId || `exec_${Date.now()}`,
  agent: executionResult.agentType || executionResult.agent || 'unknown',
  command: executionResult.originalCommand || executionResult.command || 'unknown',
  language: executionResult.detectedLanguage || 'unknown',
  confidence: executionResult.confidence || 0,
  status: executionResult.status || 'completed',
  
  // Execution details
  execution: {
    estimatedTime: executionResult.execution?.estimatedTime || 'N/A',
    requirements: executionResult.execution?.requirements || [],
    safety: executionResult.execution?.safety || 'safe'
  },
  
  // Response data - ensure it's always an object
  response: {
    message: executionResult.response?.message || 
             executionResult.response || 
             executionResult.output || 
             'Command executed successfully',
    type: executionResult.response?.type || 'response',
    data: executionResult.response?.data || null
  },
  
  // Metadata
  metadata: {
    processingTime: executionResult.metadata?.processingTime || Date.now(),
    processingCompleted: new Date().toISOString(),
    totalProcessingTime: `${Date.now() - (executionResult.metadata?.processingTime || Date.now())}ms`,
    version: 'MK8',
    workflow: 'multi-agent-processor'
  },
  
  // Context for follow-up commands
  context: {
    sessionId: executionResult.sessionId || 'unknown',
    userId: executionResult.userId || 'unknown',
    previousCommand: executionResult.originalCommand || executionResult.command || 'unknown',
    agentHistory: [executionResult.agentType || executionResult.agent || 'unknown']
  }
};

// Log final result
console.log('VAULT MK8 - Final Response:', {
  agent: finalResponse.agent,
  success: finalResponse.success,
  processingTime: finalResponse.metadata.totalProcessingTime
});

return [finalResponse];
