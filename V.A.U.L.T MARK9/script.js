// VAULT MK9 - Gelişmiş Frontend Script

const langs = {
    tr: {
        title: "VAULT MK9",
        desc: "Çoklu ajan komut merkezi. Komutunuzu yazın, n8n backend ile çalışır.",
        placeholder: "Komutunuzu yazın...",
        send: "Gönder",
        test: "Test",
        endpointPlaceholder: "n8n webhook endpoint URL",
        testSuccess: "✅ Bağlantı başarılı!",
        testFail: "❌ Bağlantı başarısız!",
        error: "Bir hata oluştu!",
        success: "Başarılı!"
    },
    en: {
        title: "VAULT MK9",
        desc: "Multi-agent command center. Type your command, works with n8n backend.",
        placeholder: "Type your command...",
        send: "Send",
        test: "Test",
        endpointPlaceholder: "n8n webhook endpoint URL",
        testSuccess: "✅ Connection successful!",
        testFail: "❌ Connection failed!",
        error: "An error occurred!",
        success: "Success!"
    }
};
let currentLang = 'tr';

function setLang(lang) {
    currentLang = lang;
    document.getElementById('title').textContent = langs[lang].title;
    document.getElementById('desc').textContent = langs[lang].desc;
    document.getElementById('chat-input').placeholder = langs[lang].placeholder;
    document.getElementById('send-btn').textContent = langs[lang].send;
    document.getElementById('test-endpoint').textContent = langs[lang].test;
    document.getElementById('endpoint').placeholder = langs[lang].endpointPlaceholder;
    document.getElementById('lang-tr').classList.toggle('active', lang==='tr');
    document.getElementById('lang-en').classList.toggle('active', lang==='en');
}
document.getElementById('lang-tr').onclick = () => setLang('tr');
document.getElementById('lang-en').onclick = () => setLang('en');
setLang('tr');

const chatArea = document.getElementById('chat-area');
function addMsg(text, type='bot', meta={}) {
    const div = document.createElement('div');
    div.className = 'msg ' + type;
    // Sadece mesaj - agent/status gösterimi kaldırıldı
    // Mesaj
    const msgSpan = document.createElement('span');
    msgSpan.textContent = text;
    div.appendChild(msgSpan);
    // Metadata
    if (meta.metadata) {
        const metaDiv = document.createElement('div');
        metaDiv.className = 'meta';
        metaDiv.textContent = `v:${meta.metadata.version || ''} | t:${meta.metadata.processingCompleted || meta.metadata.time || ''}`;
        div.appendChild(metaDiv);
    }
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
}
function clearChat() { chatArea.innerHTML = ''; }

// Endpoint testi ve localStorage
const endpointInput = document.getElementById('endpoint');
// Sayfa yüklendiğinde kaydedilmiş endpoint'i yükle
window.onload = function() {
    const savedEndpoint = localStorage.getItem('vault_mk9_endpoint');
    if (savedEndpoint) {
        endpointInput.value = savedEndpoint;
    }
};

document.getElementById('test-endpoint').onclick = async function() {
    const url = endpointInput.value.trim();
    if (url) {
        localStorage.setItem('vault_mk9_endpoint', url); // Kaydet
    }
    addMsg(langs[currentLang].test + '...', 'info');
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ command: 'ping', userId: 'test', sessionId: Date.now().toString() }),
            timeout: 5000
        });
        if (res.ok) {
            addMsg(langs[currentLang].testSuccess, 'success');
        } else {
            addMsg(langs[currentLang].testFail, 'error');
        }
    } catch {
        addMsg(langs[currentLang].testFail, 'error');
    }
};

// Komut gönderme
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
chatForm.onsubmit = async function(e) {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    addMsg(text, 'user');
    chatInput.value = '';
    const url = endpointInput.value.trim();
    if (url) {
        localStorage.setItem('vault_mk9_endpoint', url); // Her komutta kaydet
    }
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ command: text, userId: 'frontend', sessionId: Date.now().toString() }),
            timeout: 10000
        });
        const data = await res.text();
        let msg = '';
        try {
            let json = JSON.parse(data);
            console.log('VAULT MK9 Backend Response:', json);
            if (Array.isArray(json)) json = json[0];
            // Gelişmiş mesaj ve meta gösterimi
            if (json.success === false) {
                addMsg(json.error || 'Backend Error', 'error');
            } else {
                msg = json.response?.message || json.message || JSON.stringify(json, null, 2);
                addMsg(msg, 'bot', {
                    agent: json.agent || json.agentType,
                    status: json.status,
                    metadata: json.metadata
                });
            }
        } catch (parseErr) {
            console.error('VAULT MK9 JSON Parse Error:', parseErr);
            console.log('Raw response data:', data);
            console.log('Response length:', data.length);
            console.log('Response type:', typeof data);
            // İlk 200 karakteri göster
            const preview = data.length > 200 ? data.substring(0, 200) + '...' : data;
            addMsg(`${langs[currentLang].error} (JSON Parse): ${preview}`, 'error');
        }
    } catch (err) {
        console.error('VAULT MK9 Request Error:', err);
        addMsg(`${langs[currentLang].error}: ${err.message}`, 'error');
    }
};
