# V.A.U.L.T
## Virtual Assistant for Universal & Local Tasks

![Status](https://img.shields.io/badge/Status-Active%20Development-brightgreen?style=for-the-badge&labelColor=000000)
![Mark](https://img.shields.io/badge/Current-MARK%20XXI-e09d55?style=for-the-badge&labelColor=000000)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white&labelColor=000000)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white&labelColor=000000)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge&labelColor=000000)

[![Portfolio](https://img.shields.io/badge/Portfolio-Visit-blue?style=for-the-badge)](https://kutaykilicai.github.io/Kutay-portfolio.github.io/)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/kutay-k%C4%B1l%C4%B1%C3%A7-322409125/)
[![Email](https://img.shields.io/badge/Email-Contact-EA4335?style=for-the-badge&logo=gmail)](mailto:vodkakutay@gmail.com)

*Kutay'ın kişisel battlestation'ı — Iron Man'in JARVIS'inden ilham alınan, sürekli gelişen bir AI cockpit sistemi*

---

## Proje Vizyonu

V.A.U.L.T, **Claude + Gemini + Kimi** üçlüsünü tek bir dark-glassmorphism arayüzde birleştiren yerel bir AI orchestration sistemidir. Her **MARK** versiyonu yeni özellikler ekleyerek evrilen bu proje, basit terminal araçlarından tam bir JARVIS cockpit'e uzanan bir yolculuktur.

---

## MARK XXI — En Güncel Versiyon

**Yayın Tarihi:** 23 Mayıs 2026

### Yeni Özellikler

**JARVIS Holografik Animasyon (Canvas)**
- 3 model × 3 state: Claude (hex rings), Gemini (spiral energy), Kimi (matrix streams)
- State geçişleri: idle → active (yazarken) → responding (Enter sonrası 9s)
- Model değiştirince renk geçiş animasyonu

**Second Brain Paneli**
- `C:\Users\Kutay\second-brain\` dosya ağacı gezintisi
- Tıklanabilir dosya okuma (md, txt, json, yaml, py, js, ts, csv)
- Path traversal koruması

**Okunabilirlik Fix**
- Tüm metin renkleri güncellendi: `--txt` #e2eaf8, `--txt-dim` #9aabcc, `--txt-muted` #6a7d9f
- Font boyutu 13px → 14px

**Güvenilir Başlatma**
- `start.bat` + `launch_bg.bat` iki dosya yaklaşımı
- `stop.bat` ile temiz kapanma
- Header'da Shutdown butonu (`/api/shutdown`)

---

## Mimari

```
VAULT MARK XXI/
├── vault_backend.py    # FastAPI + pywinpty PTY server (port 8765)
├── index.html          # React 18 CDN + xterm.js 5.3.0 tek dosya frontend
├── start.bat           # Başlatıcı (eski instance'ı öldürür, yeni başlatır)
├── launch_bg.bat       # Arka plan runner (chcp 65001 + python)
├── stop.bat            # Port 8765 process'ini öldürür
└── requirements.txt    # fastapi, uvicorn, httpx, psutil, pywinpty, bs4, lxml
```

**Backend API Endpoints:**
- `GET /` — index.html serve
- `WS /ws/pty/{model}` — Claude/Gemini/Kimi PTY terminal
- `WS /ws/metrics` — Sistem metrikleri (CPU, RAM, GPU, network, uptime)
- `GET /api/memory` — Obsidian vault memory okuma
- `GET/POST /api/shared-context` — Context Bridge pad
- `POST /api/optimize-prompt` — Gemini CLI prompt optimizer
- `POST /api/optimize-context` — Gemini CLI context bridge
- `GET /api/claude-usage` — Claude mesaj sayacı
- `GET /api/gemini-usage` — Gemini çağrı sayacı
- `GET /api/kimi-balance` — Kimi API bakiye
- `GET /api/second-brain/list` — Second Brain dosya ağacı
- `GET /api/second-brain/read` — Dosya okuma
- `GET /api/fetch-web` — Proxy web fetch (BeautifulSoup)
- `POST /api/upload` — Dosya yükleme
- `POST /api/shutdown` — Sunucu kapatma

---

## MARK Evrim Zaman Çizelgesi

| Versiyon | Öne Çıkan Özellik |
|:--------:|:-----------------|
| MARK XII | Terminal overflow fix + dosya upload routing |
| MARK XIII | Agentic OS UI — Skills/Automation/Chart panelleri |
| MARK XIV | --dangerously-skip-permissions, Kutay skills, web fetch+screenshot |
| MARK XV | Broadcast Mode (Ctrl+B) + Shared Context Pad + Tri-AI Context Bridge |
| MARK XVI | AI Handoff (Ctrl+H) + Prompt Optimizer + Claude/Gemini/Kimi usage stats |
| MARK XVIII | Encoding fixes + Claude terminal fix + Gemini CLI optimizer + Big Token Dashboard |
| MARK XX | Glassmorphism+Neumorphism UI, Smart Context Bridge, 3-AI usage progress bars |
| **MARK XXI** | **JARVIS holo animasyon + Second Brain panel + okunabilirlik fix** |

---

## Hızlı Başlangıç

### Gereksinimler

- Python 3.10+
- Claude Code CLI (`claude`)
- Gemini CLI (`gemini`)
- Kimi (`kimi.exe` — opsiyonel)
- Windows 10/11 (pywinpty Windows'a özgüdür)

### Kurulum

```powershell
# Repoyu klonla
git clone https://github.com/kutaykilicai/V.A.U.L.T.git
cd "V.A.U.L.T"

# MARK XXI klasörüne gir
cd "VAULT MARK XXI"

# Bağımlılıkları kur
pip install -r requirements.txt

# Playwright kurulumu (web fetch için)
playwright install chromium

# Başlat
start.bat
```

Tarayıcı otomatik açılır: `http://localhost:8765`

### Durdurma

```powershell
stop.bat
# veya header'daki ⏻ Shutdown butonuna tıkla
```

---

## Yapılandırma

`vault_backend.py` içindeki sabit değerleri düzenlemelisiniz:

```python
MEMORY_PATH = Path(r"F:\Obsidian_Vault\Claude_Vault\Memory\MEMORY.md")  # Obsidian vault
SECOND_BRAIN = Path(r"C:\Users\Kutay\second-brain")                       # Second Brain dizini
PORT = 8765                                                                # Backend portu
```

Kimi API anahtarı için `kimi_key.txt` dosyası oluşturun (git ignore edilir):
```
sk-moonshot-xxxxx
```

---

## Güvenlik Notu

Bu proje **yerel kullanım** için tasarlanmıştır. API'ler kimlik doğrulama içermez ve `0.0.0.0` adresinde dinler. İnternete açık bir sunucuda çalıştırmayın.

---

## Otomatik Gece Denetimi

Her gece 00:00'da bir Claude Code rutini:
1. VAULT MARK XXI'in GitHub'daki güncel halini inceler
2. Bug, eksik özellik ve geliştirme önerileri listesi hazırlar  
3. Listeyi Notion'da V.A.U.L.T sayfasına kaydeder

---

## Lisans

MIT License — Özgürce kullanın, geliştirin, paylaşın.

Copyright (c) 2026 Kutay Kılıç

---

```
 __   ___   _   _   _  _____     __  __  __  __
 \ \ / / | | | | | | ||_   _|   |  \/  |/  \|  \
  \ V /| |_| | | | | |  | |     | |\/| | /\ | /\ |
   \_/ |  _  | | |_| |  | |     | |  | | \/ | \/  |
   | | | | | | |  _  |  | |     | |  | |\__/|__|
   |_| |_| |_| |_| |_|  |_|     |_|  |_|

  Virtual Assistant for Universal & Local Tasks
  MARK XXI — Holo Animation + Second Brain + Readability Fix
```

*"The future is not something we enter. The future is something we create."*
