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
        console.log('Gönderilen payload:', payload);
        console.log('Webhook URL:', n8nWebhookUrl);
        
        const response = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-VAULT-Version': 'MK8'
            },
            body: JSON.stringify(payload)
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        if (!response.ok) {
            throw new Error(`API Hatası: Sunucu ${response.status} durum koduyla cevap verdi.`);
        }
        
        // Response text'ini önce al ve logla
        const responseText = await response.text();
        console.log('Raw response text:', responseText);
        
        // Boş response kontrolü
        if (!responseText || responseText.trim() === '') {
            throw new Error('Backend boş cevap verdi.');
        }
        
        // JSON parse etmeyi dene
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (jsonError) {
            console.error('JSON parse hatası:', jsonError);
            console.error('Response text:', responseText);
            throw new Error(`JSON parse hatası: ${jsonError.message}. Raw response: ${responseText.substring(0, 200)}...`);
        }
        
        console.log('Parsed result:', result);
        
        // ⚠️ ÖNEMLİ: Array kontrolü ekledik
        if (Array.isArray(result)) {
            // Eğer cevap array ise, ilk elementi al
            handleBackendResponse(result[0]);
        } else {
            // Direkt obje ise
            handleBackendResponse(result);
        }

    } catch (error) {
        console.error("Bağlantı Hatası:", error);
        
        let userFriendlyError = error.message;
        
        if (error.message.includes('Failed to fetch')) {
            userFriendlyError = 'Bağlantı hatası. Backend çalıştığından emin olun.';
        } else if (error.message.includes('JSON parse')) {
            userFriendlyError = 'Backend geçersiz JSON gönderdi. Backend loglarını kontrol edin.';
        } else if (error.message.includes('CORS')) {
            userFriendlyError = 'CORS hatası. Backend CORS ayarlarını kontrol edin.';
        }
            
        addMessageToInterface(userFriendlyError, 'error');
    } finally {
        executeButton.disabled = false;
        executeButton.innerText = originalButtonText;
    }
}

// Backend'den gelen cevabı işleyen geliştirilmiş fonksiyon
function handleBackendResponse(result) {
    console.log("Backend Cevabı (İşleniyor):", result);
    
    try {
        if (!result) {
            addMessageToInterface("Boş cevap alındı.", 'error');
            return;
        }

        // Başarılı cevap kontrolü - MK8 formatına uygun
        if (result.success === true && result.response) {
            
            let displayMessage = '';
            let messageType = 'ai';
            
            // Agent tipine göre mesaj formatlama
            switch(result.agent) {
                case 'browser':
                    // Browser automation cevabı - kullanıcı dostu mesaj
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
                    // Sistem mesajı
                    displayMessage = `⚙️ Sistem: ${result.response.message || result.response}`;
                    messageType = 'info';
                    break;
                    
                case 'ai':
                case 'ai_gemini':
                    // AI cevabı - direkt mesajı göster
                    displayMessage = result.response.message || 
                                   result.response.data || 
                                   JSON.stringify(result.response);
                    messageType = 'ai';
                    break;
                    
                case 'file':
                    // Dosya işlemi
                    displayMessage = `📁 Dosya İşlemi: ${result.response.message || result.response}`;
                    messageType = 'info';
                    break;
                    
                case 'api':
                    // API işlemi
                    displayMessage = `🔗 API İşlemi: ${result.response.message || result.response}`;
                    messageType = 'info';
                    break;
                    
                case 'database':
                    // Veritabanı işlemi
                    displayMessage = `🗄️ Veritabanı: ${result.response.message || result.response}`;
                    messageType = 'info';
                    break;
                    
                case 'chitchat':
                    // Sohbet mesajı - direkt cevabı göster
                    displayMessage = result.response.message || result.response;
                    messageType = 'ai';
                    break;
                    
                default:
                    // Bilinmeyen agent - ham mesajı göster
                    displayMessage = result.response.message || 
                                   result.response.data || 
                                   `Agent (${result.agent}): ${JSON.stringify(result.response)}`;
                    messageType = 'ai';
            }
            
            // Mesajı arayüze ekle
            addMessageToInterface(displayMessage, messageType);
            
            // Debug bilgisi (konsola)
            if (result.metadata) {
                console.log("Metadata:", {
                    agent: result.agent,
                    status: result.status,
                    processingTime: result.metadata.processingTime,
                    version: result.metadata.version
                });
            }
            
        } else if (result.error) {
            // Hata mesajı
            addMessageToInterface(`❌ Hata: ${result.error}`, 'error');
            
        } else {
            // Beklenmeyen format - MK8 formatına uygun değil
            console.warn("Beklenmeyen cevap formatı:", result);
            const fallbackMessage = result.message || 
                                  result.text || 
                                  `Cevap alındı (${result.agent || 'unknown'} agent)`;
            addMessageToInterface(fallbackMessage, 'info');
        }
        
    } catch (parseError) {
        console.error("Cevap işlenirken hata:", parseError);
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
});