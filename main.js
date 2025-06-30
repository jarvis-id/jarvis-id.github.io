// main.js (Versi dengan Suara & Lokasi)

// Konfigurasi Utama
const BACKEND_URL = 'http://localhost:5000/process';

// Elemen DOM
const chatLog = document.getElementById('chat-log');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const statusBar = document.getElementById('status-bar');

// --- FITUR BARU: Fungsi untuk Text-to-Speech ---
function speak(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
}

// Fungsi untuk menambah pesan ke log (sekarang memanggil 'speak')
function addMessage(sender, text) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    const preElement = document.createElement('pre');
    preElement.textContent = text;
    messageElement.appendChild(preElement);
    chatLog.insertBefore(messageElement, chatLog.firstChild);
    chatLog.scrollTop = 0;
    if (sender === 'jarvis') {
        speak(text);
    }
}

// --- FITUR BARU: Fungsi untuk menangani permintaan lokasi dari backend ---
function handleGetLocation() {
    if (!navigator.geolocation) {
        addMessage('jarvis', 'Maaf, browser Anda tidak mendukung Geolocation.');
        return;
    }
    const success = (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const locationInfo = `Lokasi berhasil didapatkan:\nLintang: ${latitude}\nBujur: ${longitude}\n\nLihat di peta: https://www.google.com/maps?q=${latitude},${longitude}`;
        addMessage('jarvis', locationInfo);
    };
    const error = () => {
        addMessage('jarvis', 'Gagal mendapatkan lokasi. Pastikan Anda telah memberikan izin akses lokasi untuk situs ini.');
    };
    navigator.geolocation.getCurrentPosition(success, error);
}

// Fungsi utama untuk menangani input pengguna
async function handleUserInput() {
    const userText = userInput.value.trim();
    if (userText === '') return;
    addMessage('user', userText);
    userInput.value = '';
    statusBar.textContent = 'Menghubungi JARVIS Engine...';
    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: userText })
        });
        if (!response.ok) throw new Error(`Server merespons dengan error! Status: ${response.status}`);
        const result = await response.json();
        
        // --- LOGIKA DIPERBARUI UNTUK MENANGANI RESPON DARI BACKEND ---
        switch (result.type) {
            case 'chat':
            case 'tech_result':
            case 'error':
                addMessage('jarvis', result.content);
                break;
            case 'frontend_action':
                addMessage('jarvis', result.content);
                if (result.action_name === 'get_location') {
                    handleGetLocation();
                }
                break;
            default:
                addMessage('jarvis', 'Menerima tipe respons yang tidak dikenal dari server.');
        }
    } catch (error) {
        console.error('Gagal terhubung ke JARVIS Engine:', error);
        addMessage('jarvis', 'Error: Tidak dapat terhubung ke JARVIS Engine di WSL.');
    }
    statusBar.textContent = 'Siap menerima perintah.';
}

// Event Listeners
sendButton.addEventListener('click', handleUserInput);
userInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') handleUserInput(); });

// Pesan selamat datang
window.onload = () => {
    addMessage('jarvis', 'Selamat datang. Saya JARVIS. Silakan berikan perintah Anda.');
    statusBar.textContent = 'Siap menerima perintah.';
};
