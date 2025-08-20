// VAULT MK8 - Advanced Command Processor & Language Detection
const inputData = $input.all();
const command = inputData[0]?.json?.command || inputData[0]?.json?.body?.command || '';
const userId = inputData[0]?.json?.userId || 'anonymous';
const sessionId = inputData[0]?.json?.sessionId || Date.now().toString();

// Language Detection Patterns
const turkishPatterns = {
  browser: ['google', 'ara', 'arama', 'git', 'web', 'site', 'açar', 'gir', 'bul', 'tarama'],
  system: ['kapat', 'aç', 'çalıştır', 'durdur', 'listele', 'sistem', 'process', 'kill', 'başlat'],
  file: ['dosya', 'klasör', 'oluştur', 'sil', 'kopyala', 'taşı', 'yaz', 'oku', 'kaydet'],
  ai: ['yaz', 'analiz', 'çevir', 'özetle', 'sor', 'anlat', 'açıkla', 'değerlendir'],
  api: ['istek', 'veri', 'gönder', 'al', 'api', 'webhook', 'servis'],
  database: ['veritabanı', 'kayıt', 'sorgula', 'güncelle', 'ekle', 'db'],
  chitchat: ['selam', 'merhaba', 'naber', 'nasılsın', 'iyi misin', 'günaydın', 'iyi akşamlar', 'iyi geceler', 'hoşça kal', 'görüşürüz', 'teşekkür', 'sağol', 'rica', 'tamam', 'evet', 'hayır', 'anladım', 'tamam', 'ok']
};

const englishPatterns = {
  browser: ['google', 'search', 'navigate', 'open', 'visit', 'scrape', 'browser', 'web'],
  system: ['run', 'execute', 'kill', 'stop', 'start', 'list', 'process', 'system'],
  file: ['file', 'folder', 'create', 'delete', 'copy', 'move', 'write', 'read', 'save'],
  ai: ['write', 'analyze', 'translate', 'summarize', 'explain', 'generate', 'ask'],
  api: ['request', 'fetch', 'send', 'get', 'post', 'api', 'webhook', 'service'],
  database: ['database', 'query', 'insert', 'update', 'select', 'db', 'record'],
  chitchat: ['hello', 'hi', 'hey', 'how are you', 'howdy', 'good morning', 'good afternoon', 'good evening', 'good night', 'bye', 'goodbye', 'see you', 'thanks', 'thank you', 'you\'re welcome', 'okay', 'ok', 'yes', 'no', 'got it', 'understood']
};

// Advanced Command Analysis
function analyzeCommand(cmd) {
  const lowerCmd = cmd.toLowerCase();
  const words = lowerCmd.split(/\s+/);
  
  // Language detection
  let turkishScore = 0;
  let englishScore = 0;
  
  words.forEach(word => {
    Object.values(turkishPatterns).flat().forEach(pattern => {
      if (word.includes(pattern)) turkishScore++;
    });
    Object.values(englishPatterns).flat().forEach(pattern => {
      if (word.includes(pattern)) englishScore++;
    });
  });
  
  const detectedLanguage = turkishScore > englishScore ? 'turkish' : 'english';
  const patterns = detectedLanguage === 'turkish' ? turkishPatterns : englishPatterns;
  
  // Agent scoring
  const agentScores = {};
  Object.keys(patterns).forEach(agent => {
    agentScores[agent] = 0;
    patterns[agent].forEach(pattern => {
      if (lowerCmd.includes(pattern)) {
        agentScores[agent] += pattern.length; // Longer matches get higher scores
      }
    });
  });
  
  // Find best matching agent
  const bestAgent = Object.keys(agentScores).reduce((a, b) => 
    agentScores[a] > agentScores[b] ? a : b
  );
  
  // Extract parameters
  const urlMatch = cmd.match(/https?:\/\/[^\s]+/);
  const fileMatch = cmd.match(/[\w\-\. ]+\.(txt|json|csv|pdf|doc|xlsx?)/);
  const processMatch = cmd.match(/\"([^\"]+)\"|'([^']+)'|\b([A-Za-z0-9_\-]+\.(exe|app|py|js))\b/);
  
  return {
    originalCommand: cmd,
    detectedLanguage,
    primaryAgent: bestAgent,
    confidence: Math.max(...Object.values(agentScores)) / words.length,
    parameters: {
      url: urlMatch ? urlMatch[0] : null,
      filename: fileMatch ? fileMatch[0] : null,
      process: processMatch ? (processMatch[1] || processMatch[2] || processMatch[3]) : null,
      searchQuery: bestAgent === 'browser' ? cmd.replace(/google|ara|search/gi, '').trim() : null
    },
    agentScores,
    timestamp: new Date().toISOString(),
    sessionId,
    userId
  };
}

// Process the command
const analysis = analyzeCommand(command);

// Prepare execution context
const executionContext = {
  ...analysis,
  executionId: `exec_${Date.now()}`,
  status: 'routing',
  metadata: {
    processingTime: Date.now(),
    version: 'MK8',
    workflow: 'multi-agent-processor'
  }
};

// Log for monitoring
console.log(`VAULT MK8 - Command Analysis:`, {
  command: analysis.originalCommand,
  agent: analysis.primaryAgent,
  language: analysis.detectedLanguage,
  confidence: analysis.confidence
});

return [executionContext]; 