# 🚀 VAULT MK8 - Advanced Multi-Agent Command Processor

VAULT MK8, Türkçe ve İngilizce doğal dil komutlarını işleyen, çoklu agent sistemi ile çalışan gelişmiş bir komut işlemcisidir.

## 📋 Özellikler

- 🧠 **Akıllı Dil Algılama**: Türkçe, İngilizce ve karışık komut desteği
- 🎯 **Akıllı Agent Yönlendirme**: AI destekli komut sınıflandırma ve parametre çıkarma
- 🔄 **Bağlam Yönetimi**: Oturum takibi ve komut geçmişi korunması
- ⚡ **Paralel İşlem**: Çoklu agent koordinasyonu için optimize edilmiş
- 🛡️ **Güvenli Hata Yönetimi**: Zarif düşüş ve yeniden deneme mekanizmaları
- 📊 **Gerçek Zamanlı İzleme**: İşlem günlüğü ve performans takibi

## 🏗️ Sistem Mimarisi

### Frontend (HTML/JavaScript)
- `vault_mk8_frontend.html` - Ana kullanıcı arayüzü
- `script.js` - Frontend JavaScript mantığı
- `test_n8n_connection.html` - Bağlantı test sayfası

### Backend (N8N Workflow)
- `VAULT MK8 - Advanced Multi-Agent Command.json` - N8N workflow dosyası

## 🚀 Kurulum

### 1. N8N Kurulumu

```bash
# N8N'i global olarak kurun
npm install -g n8n

# N8N'i başlatın
n8n start
```

### 2. Workflow İçe Aktarma

1. N8N arayüzüne gidin: `http://localhost:5678`
2. **Workflows** → **Import from JSON**
3. `VAULT MK8 - Advanced Multi-Agent Command.json` dosyasını yükleyin
4. Workflow'u aktif hale getirin

### 3. API Anahtarları (Opsiyonel)

AI Agent fonksiyonalitesi için environment değişkenleri ekleyin:

```bash
# N8N environment dosyasına ekleyin
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_key_here  # Opsiyonel
```

### 4. Frontend Kurulumu

1. `vault_mk8_frontend.html` dosyasını web sunucusunda çalıştırın
2. Veya doğrudan tarayıcıda açın
3. N8N endpoint URL'ini ayarlayın

## 🧪 Test Etme

### Bağlantı Testi

`test_n8n_connection.html` dosyasını açarak bağlantıyı test edin:

```bash
# Test sayfasını açın
open test_n8n_connection.html
```

### Komut Testleri

```bash
# Türkçe komut testi
curl -X POST http://localhost:5678/webhook/vault-mk8-command \
  -H "Content-Type: application/json" \
  -d '{"command": "yaz merhaba dünya", "userId": "test"}'

# İngilizce komut testi
curl -X POST http://localhost:5678/webhook/vault-mk8-command \
  -H "Content-Type: application/json" \
  -d '{"command": "write hello world", "userId": "test"}'

# Browser komutu testi
curl -X POST http://localhost:5678/webhook/vault-mk8-command \
  -H "Content-Type: application/json" \
  -d '{"command": "google ara javascript", "userId": "test"}'
```

## 📝 Kullanım Örnekleri

### Browser Komutları
```json
// Türkçe
{"command": "google ara node.js eğitimi"}
{"command": "git https://github.com/nodejs/node"}

// İngilizce
{"command": "search react documentation"}
{"command": "navigate to https://reactjs.org"}
```

### Sistem Komutları
```json
// Türkçe
{"command": "listele processes"}
{"command": "çalıştır notepad"}

// İngilizce
{"command": "list running processes"}
{"command": "kill chrome.exe"}
```

### AI Komutları
```json
// Türkçe
{"command": "yaz makine öğrenmesi hakkında blog"}
{"command": "çevir Hello World"}

// İngilizce
{"command": "write an article about AI"}
{"command": "explain quantum computing"}
```

### Sohbet Komutları
```json
// Türkçe
{"command": "merhaba"}
{"command": "nasılsın"}
{"command": "teşekkür ederim"}

// İngilizce
{"command": "hello"}
{"command": "how are you"}
{"command": "thank you"}
```

### Dosya Komutları
```json
// Türkçe
{"command": "oluştur test.txt dosyası"}
{"command": "oku config.json"}

// İngilizce
{"command": "create backup.json file"}
{"command": "copy data.csv to archive/"}
```

## 🔧 Sorun Giderme

### Yaygın Sorunlar

#### 1. Webhook Yanıt Vermiyor
- N8N'in çalıştığından emin olun
- Webhook URL'ini doğrulayın
- Firewall/proxy ayarlarını kontrol edin

#### 2. Agent Yönlendirme Yanlış
- Komut desenlerini gözden geçirin
- Dil algılama mantığını kontrol edin
- Switch node koşullarını doğrulayın

#### 3. AI Agent Başarısız
- API anahtarlarının ayarlandığından emin olun
- Ağ bağlantısını kontrol edin
- API kotalarını doğrulayın

#### 4. Sistem Komutları Engellendi
- Güvenlik doğrulamasını gözden geçirin
- Kullanıcı izinlerini kontrol edin
- Komut sözdizimini doğrulayın

### Debug Modu

Workflow debug'ını etkinleştirmek için:

```json
"settings": {
  "saveDataErrorExecution": "all",
  "saveDataSuccessExecution": "all"
}
```

## 📊 Response Formatı

```json
{
  "success": true,
  "executionId": "exec_1234567890",
  "agent": "browser",
  "command": "google ara javascript",
  "language": "turkish",
  "confidence": 0.85,
  "status": "executing",
  "execution": {
    "estimatedTime": "5-15 seconds",
    "requirements": ["selenium", "chromedriver"],
    "safety": "user_content_filtering"
  },
  "response": {
    "type": "browser_automation",
    "message": "Tarayıcı komutu işleniyor: google ara javascript",
    "data": {
      "action": "navigate_and_search",
      "url": "https://www.google.com/search?q=javascript",
      "query": "javascript"
    }
  },
  "context": {
    "sessionId": "1234567890",
    "userId": "test",
    "previousCommand": "google ara javascript"
  }
}
```

## 🔄 Yeni Agent Ekleme

1. 🎯 Agent Router'dan sonra yeni executor node oluşturun
2. Switch node'a koşul ekleyin
3. 🧠 Intelligent Command Analyzer'da agent desenlerini güncelleyin
4. 🔄 Response Aggregator'a bağlayın

## 🛡️ Güvenlik

- Tehlikeli komutlar otomatik olarak engellenir
- Geçersiz URL'ler hata yanıtları tetikler
- Eksik parametreler fallback eylemler oluşturur
- Tüm hatalar izleme için günlüğe kaydedilir

## 📈 Performans Optimizasyonu

- Workflow önbelleğini etkinleştirin
- Uygun zaman aşımı süreleri ayarlayın
- Mümkün olduğunda paralel yürütme kullanın
- Bellek kullanımını izleyin

## 🤝 Katkıda Bulunma

1. Bu repository'yi fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 Destek

Sorunlarınız için:
- GitHub Issues kullanın
- Detaylı hata mesajları ekleyin
- Sistem bilgilerinizi paylaşın

---

🚀 **VAULT MK8 Multi-Agent Command Processor** kurumsal düzeyde otomasyon için hazır! 