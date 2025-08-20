# VAULT MK8 - Multi-Agent Komut Merkezi (Sıfırdan Kurulum)

## Özellikler
- Modern, responsive frontend (HTML+JS)
- Türkçe/İngilizce dil desteği
- n8n ile uyumlu webhook endpointine POST ile komut gönderme
- Hata ve başarı durumlarını kullanıcıya gösterme
- Örnek n8n workflow'u ile kolay backend entegrasyonu

---

## Kurulum

### 1. n8n Kurulumu

```bash
npm install -g n8n
n8n
```

Tarayıcıda `http://localhost:5678` adresine gidin.

### 2. Workflow'u Import Et

- `vaultmk8_n8n_workflow.json` dosyasını n8n arayüzünden "Import from file" ile içe aktarın.
- Workflow'u aktif hale getirin.

### 3. Frontend'i Aç

- `vaultmk8_frontend.html` dosyasını tarayıcıda açın.
- Endpoint kutusunda `http://localhost:5678/webhook/vault-mk8-command` yazmalı (değiştirebilirsiniz).
- Komutunuzu yazıp gönderin.

---

## Kullanım

- Komutunuzu yazın ve "Gönder" butonuna basın.
- Sonuçlar ve hata mesajları ekranda gösterilir.
- "Test" butonu ile endpoint bağlantısını test edebilirsiniz.
- Sağ üstten TR/EN dilini değiştirebilirsiniz.

---

## Örnek Komutlar
- `merhaba`
- `hello`
- `yaz bu bir testtir`
- `herhangi bir komut`

---

## Sorun Giderme
- n8n çalışıyor mu? (`http://localhost:5678`)
- Workflow aktif mi?
- Endpoint URL doğru mu?
- Tarayıcı konsolunda hata var mı?

---

## Geliştirici Notları
- Frontend sadece HTML+JS, ek bağımlılık yoktur.
- Backend için örnek workflow dosyası ile kolay test yapılabilir.
- Daha gelişmiş agent routing ve analiz için n8n workflow'unu genişletebilirsiniz.

---

*Bu proje sıfırdan, sade ve çalışır şekilde hazırlanmıştır.* 