document.addEventListener("DOMContentLoaded", () => {
    let GEMINI_API_KEY = "";
    let GOOGLE_API_URL = "";
    const BACKEND_URL_PING = "http://127.0.0.1:5000/ping";
    const BACKEND_URL_ASK = "http://127.0.0.1:5000/ask";
    let allConversations = {};
    let activeChatId = null;
    let uploadedFile = null;

    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatHistory = document.getElementById('chat-history');
    const timeElement = document.getElementById('system-time');
    const sendButton = document.getElementById('send-button');
    const apiStatusElement = document.getElementById('api-status');
    const clearChatButton = document.getElementById('clear-chat-button');
    const exportChatButton = document.getElementById('export-chat-button');
    const apiKeyModal = document.getElementById('api-key-modal');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveApiKeyButton = document.getElementById('save-api-key-button');
    const changeApiKeyButton = document.getElementById('change-api-key-button');
    const fileUploadInput = document.getElementById('file-upload');
    const filePreviewContainer = document.getElementById('file-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImageButton = document.getElementById('remove-image-button');
    const newChatButton = document.getElementById('new-chat-button');
    const chatList = document.getElementById('chat-list');
    const autocadAssistantButtons = document.querySelectorAll('#autocad-assistant button');

    function appendMessage(sender, text, isNew = true) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message');
        const senderClass = sender.toLowerCase() === 'user' ? 'user-message' : 'gemini-message';
        messageDiv.classList.add(senderClass);
        const senderP = document.createElement('p');
        senderP.style.fontWeight = 'bold';
        senderP.textContent = sender === 'User' ? 'User:' : '[VAULT]:';
        const textP = document.createElement('p');
        textP.style.paddingLeft = '10px';
        if (senderClass === 'gemini-message') textP.style.color = '#fff';
        textP.textContent = text;
        messageDiv.appendChild(senderP);
        messageDiv.appendChild(textP);
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        return messageDiv;
    }

    function setupApi(apiKey) {
        GEMINI_API_KEY = apiKey;
        GOOGLE_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;
    }

    function createNewChat() {
        const newId = `chat-${Date.now()}`;
        allConversations[newId] = { title: "Yeni Sohbet", history: [], isPinned: false };
        switchChat(newId);
    }

    function switchChat(chatId) {
        if (!allConversations[chatId]) return;
        activeChatId = chatId;
        renderChatHistory();
        renderChatList();
        chatInput.focus();
        saveConversations();
    }

    function renderChatHistory() {
        chatHistory.innerHTML = '';
        const currentHistory = allConversations[activeChatId]?.history || [];
        currentHistory.forEach(turn => {
            const sender = turn.role === 'user' ? 'User' : '[VAULT]';
            let content = "";
            let hasImage = false;
            turn.parts.forEach(part => {
                if (part.text) content += part.text;
                if (part.inline_data) hasImage = true;
            });
            if(hasImage) content = "[Yüklenmiş Görsel] " + content;
            appendMessage(sender, content.trim(), false);
        });
    }

    function renderChatList() {
        chatList.innerHTML = '';
        const chatIds = Object.keys(allConversations);
        chatIds.sort((a, b) => {
            const chatA = allConversations[a];
            const chatB = allConversations[b];
            if (chatA.isPinned && !chatB.isPinned) return -1;
            if (!chatA.isPinned && chatB.isPinned) return 1;
            return b.split('-')[1] - a.split('-')[1];
        });
        chatIds.forEach(id => {
            const chat = allConversations[id];
            const listItem = document.createElement('li');
            listItem.className = 'chat-list-item';
            listItem.dataset.chatId = id;
            if (id === activeChatId) listItem.classList.add('active');
            const titleSpan = document.createElement('span');
            titleSpan.className = 'chat-title';
            titleSpan.textContent = chat.title;
            titleSpan.title = chat.title;
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'chat-item-actions';
            const pinBtn = document.createElement('button');
            pinBtn.className = 'pin-chat-btn';
            pinBtn.innerHTML = '📌';
            pinBtn.title = 'Sabitle/Kaldır';
            if (chat.isPinned) pinBtn.classList.add('pinned');
            pinBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePinChat(id); });
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-chat-btn';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.title = 'Sohbeti Sil';
            deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteChat(id); });
            actionsDiv.appendChild(pinBtn);
            actionsDiv.appendChild(deleteBtn);
            listItem.appendChild(titleSpan);
            listItem.appendChild(actionsDiv);
            listItem.addEventListener('click', () => switchChat(id));
            chatList.appendChild(listItem);
        });
    }

    function deleteChat(chatId) {
        if (confirm(`'${allConversations[chatId].title}' sohbetini kalıcı olarak silmek istediğinizden emin misiniz?`)) {
            delete allConversations[chatId];
            if (activeChatId === chatId) {
                const remainingIds = Object.keys(allConversations).sort((a,b) => b.split('-')[1] - a.split('-')[1]);
                if (remainingIds.length > 0) {
                    switchChat(remainingIds[0]);
                } else {
                    createNewChat();
                }
            } else {
                saveConversations();
                renderChatList();
            }
        }
    }

    function togglePinChat(chatId) {
        const chat = allConversations[chatId];
        if (chat) {
            chat.isPinned = !chat.isPinned;
            saveConversations();
            renderChatList();
        }
    }

    function saveConversations() {
        localStorage.setItem('geminiConversations', JSON.stringify(allConversations));
        localStorage.setItem('activeGeminiChat', activeChatId);
    }

    function loadConversations() {
        const savedChats = localStorage.getItem('geminiConversations');
        const savedActiveId = localStorage.getItem('activeGeminiChat');
        if (savedChats && Object.keys(JSON.parse(savedChats)).length > 0) {
            allConversations = JSON.parse(savedChats);
            if (savedActiveId && allConversations[savedActiveId]) {
                activeChatId = savedActiveId;
            } else {
                activeChatId = Object.keys(allConversations).sort((a,b) => b.split('-')[1] - a.split('-')[1])[0];
            }
        } else {
            createNewChat();
            return;
        }
        renderChatList();
        renderChatHistory();
    }

    function removeUploadedFile() { uploadedFile = null; fileUploadInput.value = ''; filePreviewContainer.style.display = 'none'; }

    async function handleUserPrompt() {
        const promptText = chatInput.value.trim();
        if ((promptText === '' && !uploadedFile) || sendButton.disabled) return;
        sendButton.disabled = true;
        appendMessage('User', (uploadedFile ? "[Görsel] " : "") + promptText);
        const thinkingMessage = appendMessage('[VAULT]', 'Komut yönlendiriliyor...');
        try {
            const backendResponse = await fetch(BACKEND_URL_ASK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptText })
            });
            if (!backendResponse.ok) throw new Error("Yerel sunucuya bağlanılamadı.");
            const data = await backendResponse.json();
            if (data.type === 'local_command') {
                thinkingMessage.remove();
                appendMessage('[VAULT]', data.message);
            } else if (data.type === 'gemini_query') {
                if (!GEMINI_API_KEY) {
                   throw new Error("Gemini API Anahtarı ayarlanmamış.");
                }
                thinkingMessage.querySelector('p:last-child').textContent = 'Gemini ile iletişim kuruluyor...';
                const geminiResponseText = await askGeminiDirectly(data.prompt);
                thinkingMessage.remove();
                appendMessage('[VAULT]', geminiResponseText);
            }
        } catch (error) {
            thinkingMessage.remove();
            appendMessage('[VAULT]', `Hata: ${error.message}`);
        } finally {
            sendButton.disabled = false;
            removeUploadedFile();
            chatInput.value = '';
            chatInput.focus();
        }
    }
            
    async function askGeminiDirectly(prompt) {
        const currentConv = allConversations[activeChatId];
        if (!currentConv) {
            throw new Error("Aktif sohbet bulunamadı. Lütfen yeni bir sohbet başlatın.");
        }
        const userParts = [];
        if (uploadedFile) userParts.push({ inline_data: { mime_type: uploadedFile.mimeType, data: uploadedFile.data } });
        if (prompt) userParts.push({ text: prompt });
        currentConv.history.push({ role: "user", parts: userParts });
        if (currentConv.history.length === 1 && prompt) {
            currentConv.title = prompt.length > 30 ? prompt.substring(0, 27) + '...' : prompt;
            renderChatList();
        }
        const response = await fetch(GOOGLE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: currentConv.history })
        });
        if (!response.ok) { const errorData = await response.json(); throw new Error(`Gemini API Hatası: ${errorData.error.message}`); }
        const data = await response.json();
        if (!data.candidates || data.candidates.length === 0) { throw new Error("Modelden yanıt alınamadı."); }
        const geminiText = data.candidates[0].content.parts[0].text;
        currentConv.history.push(data.candidates[0].content);
        saveConversations();
        return geminiText;
    }

    function initialize() {
        const savedApiKey = localStorage.getItem('geminiApiKey');
        if (savedApiKey) {
            setupApi(savedApiKey);
        } else {
            apiKeyModal.style.display = 'flex';
        }

        fetch(BACKEND_URL_PING)
            .then(res => {
                if(res.ok) {
                    apiStatusElement.textContent = 'ACTIVE';
                    apiStatusElement.className = 'status-ok';
                    if(!localStorage.getItem('geminiApiKey')) {
                        appendMessage('[VAULT]', 'MK3 Çekirdeğine bağlanıldı. Lütfen API anahtarınızı girin.');
                    }
                } else {
                   throw new Error('Backend yanıt vermiyor.');
                }
            }).catch(err => {
                 appendMessage('[VAULT]', 'HATA: MK2 Çekirdeğine bağlanılamadı.');
                 apiStatusElement.textContent = 'ERROR';
                 apiStatusElement.className = 'status-error';
            });
        
        loadConversations();
        setInterval(() => {
            const now = new Date();
            timeElement.textContent = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }, 1000);
    }

    chatForm.addEventListener('submit', (e) => { e.preventDefault(); handleUserPrompt(); });
    newChatButton.addEventListener('click', createNewChat);
    saveApiKeyButton.addEventListener('click', () => {
        const enteredKey = apiKeyInput.value.trim();
        if (enteredKey) {
            localStorage.setItem('geminiApiKey', enteredKey);
            apiKeyModal.style.display = 'none';
            setupApi(enteredKey);
            appendMessage('[VAULT]', 'API Anahtarı başarıyla yüklendi.');
        }
    });
    // Diğer tüm event listener'lar buraya...
    
    initialize();
});