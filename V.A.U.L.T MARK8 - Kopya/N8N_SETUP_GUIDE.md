# 🔧 N8N Setup Guide - VAULT MK8

## 1. N8N Kurulumu ve Başlatma

### Windows'ta N8N Kurulumu:
```bash
# Node.js kurulu olduğundan emin olun
node --version

# N8N'i global olarak kurun
npm install -g n8n

# N8N'i başlatın
n8n
```

### N8N Başlatma Seçenekleri:
```bash
# Basit başlatma
n8n

# Port belirterek başlatma
n8n --port 5678

# Host belirterek başlatma (dış erişim için)
n8n --host 0.0.0.0 --port 5678

# SSL ile başlatma (production için)
n8n --protocol https --ssl-key /path/to/key --ssl-cert /path/to/cert
```

## 2. Workflow Import Etme

### Adım 1: N8N'e Giriş
1. Tarayıcıda `http://localhost:5678` adresine gidin
2. İlk kez kullanıyorsanız hesap oluşturun
3. Dashboard'a giriş yapın

### Adım 2: Workflow Import Etme
1. Sol menüden "Workflows" seçin
2. "Import from file" butonuna tıklayın
3. `VAULT MK8 - Advanced Multi-Agent Command.json` dosyasını seçin
4. "Import" butonuna tıklayın

### Adım 3: Workflow'u Aktifleştirme
1. Import edilen workflow'u açın
2. "Active" toggle'ını açın
3. "Save" butonuna tıklayın

## 3. Webhook URL'lerini Kontrol Etme

### Ana Workflow Webhook URL:
```
http://localhost:5678/webhook/vault-mk8-command
```

### Test Workflow Webhook URL:
```
http://localhost:5678/webhook/test-simple
```

### Webhook URL'lerini Kontrol Etme:
1. Workflow'u açın
2. "🎯 Command Input Webhook" node'una tıklayın
3. "Webhook URL" alanını kontrol edin
4. URL'yi kopyalayın ve frontend'de kullanın

## 4. CORS Ayarları

### N8N Webhook Node CORS Ayarları:
1. Webhook node'unu açın
2. "Options" sekmesine gidin
3. "Response Headers" bölümünde şunları ekleyin:
   - `Content-Type: application/json`
   - `Access-Control-Allow-Origin: *`
   - `X-VAULT-Version: MK8`

### N8N Global CORS Ayarları:
```bash
# N8N'i CORS ayarlarıyla başlatın
n8n --cors-origin "*"
```

## 5. Response Node Ayarları

### Final Response Node Kontrolü:
1. "✅ Final Response Processor" node'unu açın
2. JavaScript kodunu `FixedFinalResponseProcessor.js` dosyasından kopyalayın
3. "📤 Response Webhook" node'unu kontrol edin:
   - "Respond with" = "All incoming items"
   - Headers'da CORS ayarları olmalı

## 6. Debug ve Test

### Manuel Test:
1. Workflow'u açın
2. "Execute Workflow" butonuna tıklayın
3. Test verisi girin:
```json
{
  "command": "merhaba",
  "userId": "test-user",
  "sessionId": "123"
}
```
4. Response'u kontrol edin

### Curl ile Test:
```bash
curl -X POST http://localhost:5678/webhook/vault-mk8-command \
  -H "Content-Type: application/json" \
  -d '{"command": "merhaba", "userId": "test", "sessionId": "123"}'
```

### Frontend Test:
1. `test_n8n_connection.html` dosyasını açın
2. Webhook URL'yi kontrol edin
3. "Test Et" butonuna tıklayın

## 7. Yaygın Sorunlar ve Çözümleri

### Sorun 1: "Workflow not found"
**Çözüm:** Workflow'u aktifleştirin ve webhook URL'yi kontrol edin

### Sorun 2: "CORS error"
**Çözüm:** Webhook node'unda CORS headers ekleyin

### Sorun 3: "JSON parse error"
**Çözüm:** 
1. Final Response Processor kodunu kontrol edin
2. Response Webhook node'unu kontrol edin
3. `debug_json.js` ile debug edin

### Sorun 4: "Empty response"
**Çözüm:**
1. Workflow'u manuel olarak test edin
2. Response node'larını kontrol edin
3. JavaScript kodlarında hata olup olmadığını kontrol edin

## 8. Production Ayarları

### Güvenlik:
```bash
# N8N'i güvenli modda başlatın
n8n --host 0.0.0.0 --port 5678 --protocol https --ssl-key /path/to/key --ssl-cert /path/to/cert
```

### Environment Variables:
```bash
# .env dosyası oluşturun
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your_password
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=https
```

### Reverse Proxy (Nginx):
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5678;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 9. Monitoring ve Logs

### N8N Logs:
```bash
# N8N loglarını görüntüleyin
n8n --log-level debug

# Log dosyasına yazdırın
n8n --log-file /path/to/n8n.log
```

### Workflow Execution Logs:
1. N8N dashboard'da "Executions" sekmesine gidin
2. Workflow execution'larını görüntüleyin
3. Hata detaylarını kontrol edin

## 10. Troubleshooting Checklist

- [ ] N8N çalışıyor mu? (`http://localhost:5678`)
- [ ] Workflow aktif mi?
- [ ] Webhook URL doğru mu?
- [ ] CORS headers ekli mi?
- [ ] Final Response Processor kodu doğru mu?
- [ ] Response Webhook node'u doğru ayarlanmış mı?
- [ ] Frontend'de doğru URL kullanılıyor mu?
- [ ] Browser console'da hata var mı?

---

*Bu rehber VAULT MK8 projesi için hazırlanmıştır.* 