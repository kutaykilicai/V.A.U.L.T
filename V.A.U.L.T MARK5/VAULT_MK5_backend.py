# VAULT_MK5_backend.py (Nihai Stabil Versiyon)

import os
import subprocess
import google.generativeai as genai
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
import time

print("VAULT MK5 Dinamik Çekirdeği Başlatılıyor...")

# --- GÜVENLİK UYARISI: Bu dosyayı asla kimseyle paylaşmayın! ---
# API anahtarınızı aşağıdaki tırnak işaretlerinin arasına yapıştırın.
API_KEY = "AIzaSyBsj2K7ypQ4D4-iCIbnorH9S2NRUv-2AnQ"

if not API_KEY or API_KEY == "SIZIN_GOOGLE_API_ANAHTARINIZ":
    print("HATA: API Anahtarı bulunamadı. Lütfen koddaki 'API_KEY' değişkenini düzenleyin.")
    exit()
genai.configure(api_key=API_KEY)

SYSTEM_INSTRUCTION = "Senin adın V.A.U.L.T. Kullanıcıya 'Efendim' diye hitap et. Yanıtların öz, net ve karizmatik olsun."
chat_model = genai.GenerativeModel('gemini-1.5-pro-latest', system_instruction=SYSTEM_INSTRUCTION)
chat = chat_model.start_chat(history=[])
generation_model = genai.GenerativeModel('gemini-1.5-pro-latest')
print("Gemini modelleri çevrimiçi.")

app = Flask(__name__)
CORS(app)
print("Yerel sunucu arayüzü yapılandırıldı.")

driver = None # Tarayıcıyı oturum boyunca açık tutmak için global değişken

def execute_system_command(command_description: str):
    """Doğal dil komutunu CMD komutuna çevirir ve çalıştırır."""
    try:
        prompt = f"""
        Aşağıdaki kullanıcı isteğini, Windows Komut İstemi'nde (CMD) çalıştırılabilecek TEK BİR satır koda çevir.
        SADECE ve SADECE çalıştırılabilir komut satırını yaz, başka HİÇBİR açıklama veya ```cmd``` etiketi ekleme.
        Örnek: 'not defterini kapat' -> taskkill /F /IM notepad.exe
        Örnek: 'masaüstündeki dosyaları listele' -> dir "%USERPROFILE%\\Desktop"
        Kullanıcı isteği: '{command_description}'
        """
        response = generation_model.generate_content(prompt)
        cmd_command = response.text.strip().replace("`", "")

        if not cmd_command:
            return "İsteği bir sistem komutuna çeviremedim, Efendim."

        print(f"Çalıştırılacak CMD Komutu: {cmd_command}")
        result = subprocess.run(cmd_command, shell=True, capture_output=True, text=True, encoding='cp857')
        
        output = result.stdout + result.stderr
        if not output:
            return f"'{cmd_command}' komutu başarıyla çalıştırıldı, Efendim."
        return f"Komut sonucu:\n{output}"

    except Exception as e:
        print(f"Sistem komutu hatası: {e}")
        return f"Sistem komutunu çalıştırırken bir hata oluştu: {e}"

def execute_browser_command(command_description: str):
    """Doğal dil komutunu Selenium koduna çevirir ve çalıştırır."""
    global driver
    try:
        if driver is None or not driver.service.is_connectable():
            driver = webdriver.Chrome()
            driver.get("https://www.google.com")
        
        prompt = f"""
        Aşağıdaki doğal dil komutunu, Python Selenium ile çalıştırılabilecek bir koda çevir.
        SADECE çalıştırılabilir Python kodunu yaz, başka HİÇBİR açıklama, import ifadesi veya ```python``` etiketi ekleme.
        Kullanılacak Selenium driver nesnesinin adı 'driver' olsun.
        Mevcut sayfa: {driver.current_url}
        Kullanıcı komutu: '{command_description}'
        """
        response = generation_model.generate_content(prompt)
        selenium_code = response.text.strip().replace("```python", "").replace("```", "")
        
        if not selenium_code:
            return "İsteği bir tarayıcı eylemine dönüştüremedim, Efendim."

        print(f"Çalıştırılacak Selenium Kodu:\n---\n{selenium_code}\n---")
        exec(selenium_code, {'driver': driver, 'By': By, 'Keys': Keys, 'time': time})
        return f"Tarayıcı isteğiniz yerine getirildi: {command_description}"

    except Exception as e:
        print(f"Tarayıcı hatası: {e}")
        return f"Tarayıcıyı kontrol ederken bir hata oluştu: {e}"

@app.route('/ask', methods=['POST'])
def handle_request():
    user_prompt = request.json.get('prompt', '')
    if not user_prompt:
        return jsonify({'type': 'error', 'message': "İstem boş olamaz."}), 400

    prompt_lower = user_prompt.lower()
    
    if prompt_lower.startswith("tarayıcıda") or prompt_lower.startswith("browserda"):
        command_detail = user_prompt.split(' ', 1)[1]
        response_text = execute_browser_command(command_detail)
        return jsonify({'type': 'browser_command', 'message': response_text})
    elif "kapat" in prompt_lower or "aç" in prompt_lower or "listele" in prompt_lower or "sil" in prompt_lower:
        response_text = execute_system_command(user_prompt)
        return jsonify({'type': 'system_command', 'message': response_text})
    else:
        try:
            response = chat.send_message(user_prompt)
            return jsonify({'type': 'gemini_query', 'message': response.text})
        except Exception as e:
            return jsonify({'type': 'error', 'message': f"Ana sisteme bağlanırken bir sorun oluştu: {e}"}), 500

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

@app.route('/')
def serve_frontend():
    return send_from_directory('.', 'index.html')

if __name__ == '__main__':
    print("V.A.U.L.T. MK5 tüm sistemleri aktif etti. Arayüz http://127.0.0.1:5000 adresinde hazır.")
    app.run(host='127.0.0.1', port=5000, debug=False)