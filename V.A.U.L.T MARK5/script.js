document.addEventListener("DOMContentLoaded", () => {
    const BACKEND_URL_PING = "http://127.0.0.1:5000/ping";
    const BACKEND_URL_ASK = "http://127.0.0.1:5000/ask";
    const apiStatusElement = document.getElementById('api-status');
    const timeElement = document.getElementById('system-time');
    const chatHistory = document.getElementById('chat-history');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');

    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message');
        const senderP = document.createElement('p');
        senderP.style.fontWeight = 'bold';
        senderP.textContent = sender === 'User' ? 'User:' : '[VAULT]:';
        const textP = document.createElement('p');
        textP.style.paddingLeft = '10px';
        if (sender === '[VAULT]') textP.style.color = '#fff';
        textP.textContent = text;
        messageDiv.appendChild(senderP);
        messageDiv.appendChild(textP);
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        return messageDiv;
    }

    async function handleUserPrompt(prompt) {
        if (!prompt || sendButton.disabled) return;
        
        sendButton.disabled = true;
        appendMessage('User', prompt);
        const thinkingMessage = appendMessage('[VAULT]', 'İşleniyor...');

        try {
            const response = await fetch(BACKEND_URL_ASK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt })
            });
            if (!response.ok) throw new Error("Sunucuya bağlanılamadı.");
            
            const data = await response.json();
            thinkingMessage.remove();
            appendMessage('[VAULT]', data.message || data.response);

        } catch (error) {
            thinkingMessage.remove();
            appendMessage('[VAULT]', `Hata: ${error.message}`);
        } finally {
            sendButton.disabled = false;
            chatInput.value = '';
            chatInput.focus();
        }
    }

    function initialize() {
        fetch(BACKEND_URL_PING)
            .then(res => {
                if(res.ok) {
                    apiStatusElement.textContent = 'ACTIVE';
                    apiStatusElement.className = 'status-ok';
                    appendMessage('[VAULT]', 'Tüm sistemler çevrimiçi. Komutunuzu bekliyorum, Efendim.');
                } else {
                   throw new Error('Backend yanıt vermiyor.');
                }
            }).catch(err => {
                 appendMessage('[VAULT]', 'HATA: MK4 Çekirdeğine bağlanılamadı.');
                 apiStatusElement.textContent = 'ERROR';
                 apiStatusElement.className = 'status-error';
            });
        
        setInterval(() => {
            const now = new Date();
            timeElement.textContent = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }, 1000);
    }

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleUserPrompt(chatInput.value.trim());
    });

    initialize();
});