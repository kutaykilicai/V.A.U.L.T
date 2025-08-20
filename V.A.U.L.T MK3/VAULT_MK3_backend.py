# VAULT_MK3_backend.py (Statik Dosya Sunma Düzeltmesi)

import os
import subprocess
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

print("VAULT MK3 Yerel Komut Çekirdeği Başlatılıyor...")

# DÜZELTME: Flask'a statik dosyaların ana klasörde olduğunu belirtiyoruz.
app = Flask(__name__, static_folder='.')
CORS(app)
print("Yerel sunucu arayüzü yapılandırıldı.")

# --- Yerel Komut Fonksiyonları ---
def open_chrome():
    chrome_path = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    try:
        subprocess.Popen([chrome_path])
        return "Elbette Efendim. Chrome'u açıyorum."
    except FileNotFoundError:
        chrome_path_user = os.path.join(os.environ['LOCALAPPDATA'], "Google\\Chrome\\Application\\chrome.exe")
        try:
            subprocess.Popen([chrome_path_user])
            return "Elbette Efendim. Chrome'u açıyorum."
        except FileNotFoundError:
             return "Chrome belirtilen yollarda bulunamadı."

def open_notepad():
    subprocess.Popen(['notepad.exe'])
    return "Not Defteri açılıyor, Efendim."

LOCAL_COMMANDS = {
    "chrome'u aç": open_chrome, "google'ı aç": open_chrome,
    "not defterini aç": open_notepad, "not defteri aç": open_notepad,
}

# --- API Uç Noktaları ---
@app.route('/ask', methods=['POST'])
def handle_request():
    user_prompt = request.json.get('prompt', '').lower()
    if not user_prompt:
        return jsonify({'type': 'error', 'message': "İstem boş olamaz, Efendim."}), 400

    for keyword, function in LOCAL_COMMANDS.items():
        if keyword in user_prompt:
            response_text = function()
            return jsonify({'type': 'local_command', 'message': response_text})

    return jsonify({'type': 'gemini_query', 'prompt': user_prompt})

@app.route('/ping', methods=['GET'])
def ping():
    return jsonify({'status': 'ok'}), 200

@app.route('/')
def serve_frontend():
    return send_from_directory('.', 'index.html')

# --- Sunucuyu Başlat ---
if __name__ == '__main__':
    print("V.A.U.L.T. MK3 tüm sistemleri aktif etti. Arayüz http://127.0.0.1:5000 adresinde hazır.")
    app.run(host='127.0.0.1', port=5000)