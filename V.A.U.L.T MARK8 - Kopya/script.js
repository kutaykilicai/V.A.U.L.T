// Safe JSON parsing function to handle truncated responses
async function parseResponseSafely(response) {
    try {
        const responseText = await response.text();
        console.log('📄 Raw response:', responseText);
        console.log('📏 Response length:', responseText.length);
        
        // Check if response is empty
        if (!responseText || responseText.trim() === '') {
            console.error('🚨 Empty response detected');
            return {
                success: false,
                error: 'n8n workflow returned empty response',
                suggestion: 'Check if your workflow is active and properly configured'
            };
        }
        
        // Check if response looks like HTML
        if (responseText.trim().startsWith('<')) {
            console.error('🚨 HTML response detected');
            return {
                success: false,
                error: 'n8n returned HTML instead of JSON',
                suggestion: 'Check if your n8n workflow is running and accessible'
            };
        }
        
        // Check if response is complete JSON
        const trimmed = responseText.trim();
        if ((trimmed.startsWith('{') && !trimmed.endsWith('}')) || 
            (trimmed.startsWith('[') && !trimmed.endsWith(']'))) {
            console.error('🚨 Incomplete JSON detected');
            console.error('Starts with:', trimmed.substring(0, 50));
            console.error('Ends with:', trimmed.substring(Math.max(0, trimmed.length - 50)));
            
            return {
                success: false,
                error: 'Incomplete JSON response from n8n (truncated)',
                suggestion: 'Check n8n workflow execution and response size limits'
            };
        }
        
        // Check if response has valid JSON start
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
            console.error('🚨 Invalid JSON format');
            console.error('Response starts with:', trimmed.substring(0, 50));
            return {
                success: false,
                error: 'Response is not valid JSON format',
                suggestion: 'Check n8n workflow response node configuration'
            };
        }
        
        // Try to parse JSON
        try {
            const parsed = JSON.parse(responseText);
            console.log('✅ JSON parsed successfully:', typeof parsed);
            return parsed;
        } catch (parseError) {
            console.error('❌ JSON Parse Error:', parseError.message);
            
            // Try to identify the problem area
            const match = parseError.message.match(/position (\d+)/);
            if (match) {
                const position = parseInt(match[1]);
                const start = Math.max(0, position - 20);
                const end = Math.min(responseText.length, position + 20);
                const problemArea = responseText.substring(start, end);
                console.error(`🎯 Problem area around position ${position}:`, problemArea);
            }
            
            return {
                success: false,
                error: `JSON parsing failed: ${parseError.message}`,
                suggestion: 'Check n8n workflow JSON response format'
            };
        }
        
    } catch (error) {
        console.error('💥 Response processing error:', error);
        return {
            success: false,
            error: 'Failed to process response',
            suggestion: 'Check network connection and n8n server status'
        };
    }
}

async function executeMk8Command(commandText) {
    // Dinamik webhook URL - localStorage'dan al veya default kullan
    const getWebhookUrl = () => {
        const savedUrl = localStorage.getItem('vault_mk8_endpoint');
        return savedUrl || 'http://localhost:5678/webhook/vault-mk8-command';
    };
    
    const n8nWebhookUrl = getWebhookUrl();

    const payload = {
        command: commandText,
        userId: 'vault_frontend_user',
        sessionId: Date.now().toString()
    };

    const executeButton = document.getElementById('send-button');
    const originalButtonText = executeButton.innerText;
    
    executeButton.disabled = true;
    executeButton.innerText = 'Processing...';
    
    addMessageToInterface(commandText, 'user');

    try {
        console.log('🚀 Sending request:', payload);
        console.log('📡 Webhook URL:', n8nWebhookUrl);
        
        const response = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-VAULT-Version': 'MK8'
            },
            body: JSON.stringify(payload)
        });

        console.log('📨 Response received:');
        console.log('   Status:', response.status, response.statusText);
        console.log('   Headers:', Object.fromEntries(response.headers));
        console.log('   Content-Type:', response.headers.get('Content-Type'));

        if (!response.ok) {
            // Get response text for debugging
            const errorText = await response.text();
            console.error('❌ HTTP Error Response Body:', errorText);
            
            throw new Error(`API Hatası: Sunucu ${response.status} durum koduyla cevap verdi. Response: ${errorText.substring(0, 200)}...`);
        }
        
        // Use safe JSON parsing to handle truncated responses
        const result = await parseResponseSafely(response);
        
        // Check if parsing returned an error
        if (result.success === false && result.error) {
            addMessageToInterface(`🔧 ${result.error}\n💡 ${result.suggestion}`, 'error');
            return;
        }
        
        console.log('🎉 Parsed result:', result);
        
        // ⚠️ ÖNEMLİ: Array kontrolü ekledik
        if (Array.isArray(result)) {
            console.log('📦 Response is array, using first element');
            handleBackendResponse(result[0]);
        } else {
            console.log('📦 Response is object, using directly');
            handleBackendResponse(result);
        }

    } catch (error) {
        console.error("💥 Execution Error:", error);
        
        let userFriendlyError = error.message;
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            userFriendlyError = `🔌 Bağlantı hatası: n8n sunucusu (${n8nWebhookUrl}) çalıştığından ve erişilebilir olduğundan emin olun.`;
            console.error('💡 Debug tip: n8n sunucunuzun çalıştığını ve webhook URL\'inizin doğru olduğunu kontrol edin.');
            
        } else if (error.message.includes('JSON parse')) {
            userFriendlyError = '🔧 JSON Parse Hatası: Backend geçerli JSON göndermedi. Backend loglarını kontrol edin.';
            console.error('💡 Debug tip: n8n workflow\'ünüzün JSON response döndürdüğünden emin olun.');
            
        } else if (error.message.includes('CORS')) {
            userFriendlyError = '🚫 CORS Hatası: Backend CORS ayarlarını kontrol edin.';
            console.error('💡 Debug tip: n8n webhook node\'unuzda "Access-Control-Allow-Origin" header\'ının "*" olarak ayarlandığından emin olun.');
            
        } else if (error.message.includes('HTML')) {
            userFriendlyError = '📄 HTML Response: n8n workflow düzgün çalışmıyor, HTML sayfası gönderdi.';
            console.error('💡 Debug tip: n8n\'de workflow\'ünüzü test edin ve JSON response döndürdüğünden emin olun.');
        }
            
        addMessageToInterface(userFriendlyError, 'error');
        
        // Additional debugging info
        console.group('🔍 Debug Information:');
        console.log('Webhook URL:', n8nWebhookUrl);
        console.log('Payload sent:', payload);
        console.log('Error type:', error.constructor.name);
        console.log('Full error:', error);
        console.groupEnd();
        
    } finally {
        executeButton.disabled = false;
        executeButton.innerText = originalButtonText;
    }
}

// Backend'den gelen cevabı işleyen geliştirilmiş fonksiyon
function handleBackendResponse(result) {
    console.log("🎯 Processing Backend Response:", result);
    
    try {
        if (!result) {
            addMessageToInterface("⚠️ Boş cevap alındı.", 'error');
            return;
        }

        // Debug: Response structure'ı logla
        console.log('📋 Response structure:');
        console.log('   Keys:', Object.keys(result));
        console.log('   Success:', result.success);
        console.log('   Agent:', result.agent);
        console.log('   Status:', result.status);

        // Başarılı cevap kontrolü - MK8 formatına uygun
        if (result.success === true && result.response) {
            
            let displayMessage = '';
            let messageType = 'ai';
            
            // Agent tipine göre mesaj formatlama
            switch(result.agent) {
                case 'browser':
                    if (result.status === 'executing') {
                        displayMessage = `🌐 Tarayıcı Komutu İşleniyor...\n\n` +
                                       `Komut: ${result.command}\n` +
                                       `URL: ${result.execution?.command?.url || 'N/A'}\n` +
                                       `Tahmini Süre: ${result.execution?.estimatedTime || 'Bilinmiyor'}\n\n` +
                                       `⏳ Lütfen bekleyin, sonuçlar yükleniyor...`;
                        messageType = 'info';
                    } else {
                        displayMessage = result.response.message || 
                                       `Browser komutu işlendi: ${result.command}`;
                        messageType = 'ai';
                    }
                    break;
                    
                case 'system':
                    displayMessage = `⚙️ Sistem: ${result.response.message || result.response}`;
                    messageType = 'info';
                    break;
                    
                case 'ai':
                case 'ai_gemini':
                    displayMessage = result.response.message || 
                                   result.response.data || 
                                   JSON.stringify(result.response);
                    messageType = 'ai';
                    break;
                    
                case 'file':
                    displayMessage = `📁 Dosya İşlemi: ${result.response.message || result.response}`;
                    messageType = 'info';
                    break;
                    
                case 'api':
                    displayMessage = `🔗 API İşlemi: ${result.response.message || result.response}`;
                    messageType = 'info';
                    break;
                    
                case 'database':
                    displayMessage = `🗄️ Veritabanı: ${result.response.message || result.response}`;
                    messageType = 'info';
                    break;
                    
                case 'chitchat':
                    displayMessage = result.response.message || result.response;
                    messageType = 'ai';
                    break;
                    
                default:
                    displayMessage = result.response.message || 
                                   result.response.data || 
                                   `Agent (${result.agent}): ${JSON.stringify(result.response)}`;
                    messageType = 'ai';
            }
            
            addMessageToInterface(displayMessage, messageType);
            
            // Debug bilgisi (konsola)
            if (result.metadata) {
                console.log("📊 Metadata:", {
                    agent: result.agent,
                    status: result.status,
                    processingTime: result.metadata.processingTime,
                    version: result.metadata.version
                });
            }
            
        } else if (result.error) {
            addMessageToInterface(`❌ Hata: ${result.error}`, 'error');
            
        } else {
            // Beklenmeyen format - debug için daha fazla bilgi
            console.warn("⚠️ Unexpected response format:", result);
            console.warn("Response type:", typeof result);
            console.warn("Is array:", Array.isArray(result));
            console.warn("Keys:", Object.keys(result));
            
            const fallbackMessage = result.message || 
                                  result.text || 
                                  result.response?.message ||
                                  `Cevap alındı (${result.agent || 'unknown'} agent)`;
            addMessageToInterface(fallbackMessage, 'info');
        }
        
    } catch (parseError) {
        console.error("💥 Response processing error:", parseError);
        console.error("🔍 Raw result:", result);
        addMessageToInterface("Cevap işlenemedi. Konsolu kontrol edin.", 'error');
    }
}

// Mesajları arayüze ekleyen geliştirilmiş fonksiyon
function addMessageToInterface(message, type = 'info') {
    let chatContainer = document.getElementById('chat-messages');
    
    if (!chatContainer) {
        chatContainer = document.createElement('div');
        chatContainer.id = 'chat-messages';
        chatContainer.style.cssText = 'padding: 20px; max-height: 400px; overflow-y: auto; font-family: system-ui, -apple-system, sans-serif;';
        document.body.insertBefore(chatContainer, document.body.firstChild);
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type}`;
    
    // Tip bazlı stil ayarla (emoji'lerle zenginleştirilmiş)
    const styleMap = {
        'user': {
            style: 'background: #e3f2fd; color: #1565c0; padding: 12px; margin: 8px 0; border-radius: 12px; text-align: right; border-left: 4px solid #1976d2;',
            prefix: '👤 Sen: '
        },
        'ai': {
            style: 'background: #f3e5f5; color: #6a1b9a; padding: 12px; margin: 8px 0; border-radius: 12px; white-space: pre-wrap; border-left: 4px solid #7b1fa2;',
            prefix: '🤖 AI: '
        },
        'error': {
            style: 'background: #ffebee; color: #c62828; padding: 12px; margin: 8px 0; border-radius: 12px; border-left: 4px solid #d32f2f;',
            prefix: '⚠️ '
        },
        'info': {
            style: 'background: #fff3e0; color: #e65100; padding: 12px; margin: 8px 0; border-radius: 12px; border-left: 4px solid #f57c00;',
            prefix: 'ℹ️ '
        }
    };
    
    const config = styleMap[type] || styleMap['info'];
    messageElement.style.cssText = config.style;
    
    // Prefix ekle (user hariç)
    if (type !== 'user') {
        message = config.prefix + message;
    }
    
    messageElement.textContent = message;
    
    // Zaman damgası
    const timestamp = new Date().toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    
    const timeElement = document.createElement('small');
    timeElement.style.cssText = 'display: block; opacity: 0.6; font-size: 0.75em; margin-top: 4px;';
    timeElement.textContent = timestamp;
    messageElement.appendChild(timeElement);
    
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Event listener'lar
document.addEventListener('DOMContentLoaded', function() {
    const commandInput = document.getElementById('chat-input');
    const executeButton = document.getElementById('send-button');

    executeButton?.addEventListener('click', function() {
        const command = commandInput.value.trim();
        if (command) {
            executeMk8Command(command);
            commandInput.value = '';
            commandInput.focus();
        }
    });

    commandInput?.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            const command = commandInput.value.trim();
            if (command) {
                executeMk8Command(command);
                commandInput.value = '';
            }
        }
    });
    
    commandInput?.focus();
    
    // Add debug panel
    console.log('🔧 Debug mode enabled - check console for detailed logs');
    console.log('📝 To change webhook URL, use: localStorage.setItem("vault_mk8_endpoint", "your_new_url")');
});
