// VAULT MK8 - AI Agent Logic with Actual Gemini Integration
const context = $input.all()[0].json;
const { originalCommand, detectedLanguage } = context;

// Get API key from environment
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  return [{
    ...context,
    agentType: 'ai',
    status: 'error',
    response: {
      type: 'error',
      message: detectedLanguage === 'turkish' 
        ? 'Gemini API anahtarı bulunamadı. Lütfen GEMINI_API_KEY ortam değişkenini ayarlayın.'
        : 'Gemini API key not found. Please set GEMINI_API_KEY environment variable.',
      error: 'MISSING_API_KEY'
    }
  }];
}

// AI task classification
const aiTasks = {
  // Turkish patterns
  'yaz': 'generate_text',
  'analiz': 'analyze_content', 
  'çevir': 'translate',
  'özetle': 'summarize',
  'sor': 'question_answer',
  'anlat': 'explain',
  'açıkla': 'explain',
  
  // English patterns
  'write': 'generate_text',
  'analyze': 'analyze_content',
  'translate': 'translate', 
  'summarize': 'summarize',
  'ask': 'question_answer',
  'explain': 'explain',
  'generate': 'generate_text',
  'create': 'generate_text'
};

// Determine AI task
function classifyAITask(cmd) {
  const words = cmd.toLowerCase().split(/\s+/);
  const taskType = words.find(word => Object.keys(aiTasks).includes(word));
  return aiTasks[taskType] || 'general_query';
}

const taskType = classifyAITask(originalCommand);

// Prepare AI prompt based on task and language
function buildPrompt(command, task, language) {
  const prompts = {
    turkish: {
      generate_text: `Lütfen şu konuda detaylı bir metin yaz: ${command}`,
      analyze_content: `Şu içeriği analiz et ve değerlendir: ${command}`,
      translate: `Şu metni İngilizce'ye çevir: ${command}`,
      summarize: `Şu metni özetle: ${command}`,
      question_answer: `Şu soruyu yanıtla: ${command}`,
      explain: `Şunu açıkla: ${command}`,
      general_query: `${command}`
    },
    english: {
      generate_text: `Please write detailed content about: ${command}`,
      analyze_content: `Analyze and evaluate the following: ${command}`,
      translate: `Translate the following to Turkish: ${command}`,
      summarize: `Summarize the following: ${command}`,
      question_answer: `Answer this question: ${command}`,
      explain: `Explain the following: ${command}`,
      general_query: `${command}`
    }
  };
  
  return prompts[language][task] || prompts[language]['general_query'];
}

const aiPrompt = buildPrompt(originalCommand, taskType, detectedLanguage);

// Make actual Gemini API call
async function callGeminiAPI(prompt) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || 'No response generated';
    
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

// Execute AI request
try {
  const aiResponse = await callGeminiAPI(aiPrompt);
  
  const result = {
    ...context,
    agentType: 'ai',
    status: 'completed',
    execution: {
      command: 'gemini_api_call',
      estimatedTime: '5-15 seconds',
      requirements: ['gemini_api_key'],
      safety: 'content_filtering_enabled'
    },
    response: {
      type: 'ai_generation',
      message: aiResponse,
      data: {
        provider: 'gemini-pro',
        task_type: taskType,
        prompt_used: aiPrompt,
        response_language: detectedLanguage
      }
    }
  };
  
  console.log('VAULT MK8 - AI Agent Success:', taskType);
  return [result];
  
} catch (error) {
  const result = {
    ...context,
    agentType: 'ai',
    status: 'error',
    response: {
      type: 'error',
      message: detectedLanguage === 'turkish'
        ? `AI hatası: ${error.message}`
        : `AI error: ${error.message}`,
      error: error.message
    }
  };
  
  console.error('VAULT MK8 - AI Agent Error:', error);
  return [result];
}
