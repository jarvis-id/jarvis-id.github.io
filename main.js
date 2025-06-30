// Konfigurasi Utama
const GEMINI_API_KEY = 'AIzaSyAXNv4AuqfrnDwqnD7ZMc3v7WEDMiWZ_hQ';
const BACKEND_SERVER_URL = 'http://localhost:5000/execute';

// Elemen DOM
const chatLog = document.getElementById('chat-log');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const statusBar = document.getElementById('status-bar');

// Fungsi untuk menambah pesan ke log
function addMessage(sender, text) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    
    // Gunakan <pre> untuk mempertahankan format teks output teknis
    const preElement = document.createElement('pre');
    preElement.textContent = text;
    messageElement.appendChild(preElement);

    // Sisipkan di bagian atas (karena flex-direction: column-reverse)
    chatLog.insertBefore(messageElement, chatLog.firstChild);

    // Scroll ke pesan terbaru (paling bawah)
    chatLog.scrollTop = chatLog.scrollHeight; 
}

// Fungsi untuk mengirim permintaan ke Gemini API
async function askGemini(promptText) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
    
    // Prompt cerdas untuk membedakan obrolan dan perintah
    const fullPrompt = `Anda adalah JARVIS, asisten AI untuk analis keamanan. Klasifikasikan input pengguna menjadi 'perintah teknis' atau 'obrolan umum'.
- Jika 'perintah teknis' (menggunakan alat seperti nmap, whois, curl, nikto, dll.), respons dalam format JSON: {"action": "technical_command", "command": "perintah_lengkap_untuk_dieksekusi"}.
- Jika 'obrolan umum' (pertanyaan, diskusi, sapaan), respons dalam format JSON: {"action": "general_chat", "response_text": "jawaban_percakapan_anda"}.
Selalu berikan respons dalam format JSON yang valid.

Input Pengguna: "${promptText}"`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        const responseText = data.candidates[0].content.parts[0].text;
        
        // Membersihkan dan mem-parsing JSON dari respons Gemini
        const jsonString = responseText.match(/```json\n([\s\S]*?)\n```/)[1];
        return JSON.parse(jsonString);

    } catch (error) {
        console.error('Error saat menghubungi Gemini API:', error);
        return { action: 'error', response_text: 'Maaf, ada masalah saat menghubungi AI. Cek konsol untuk detail.' };
    }
}

// Fungsi untuk mengirim perintah ke backend WSL
async function executeTechnicalCommand(commandString) {
    try {
        const response = await fetch(BACKEND_SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: commandString })
        });

        if (!response.ok) {
             throw new Error(`Server backend merespons dengan error! Status: ${response.status}`);
        }
        
        return await response.json(); // Mengembalikan {status: 'success'/'error', output: '...'}

    } catch (error) {
        console.error('Gagal terhubung ke backend WSL:', error);
        return { status: 'error', output: 'Gagal terhubung ke Execution Engine di WSL. Pastikan skrip `engine.py` sedang berjalan.' };
    }
}

// Fungsi utama untuk menangani input pengguna
async function handleUserInput() {
    const userText = userInput.value.trim();
    if (userText === '') return;

    addMessage('user', userText);
    userInput.value = '';
    statusBar.textContent = 'JARVIS sedang berpikir...';

    // Panggil Gemini untuk menginterpretasikan perintah
    const interpretation = await askGemini(userText);

    // Lakukan aksi berdasarkan interpretasi Gemini
    switch (interpretation.action) {
        case 'general_chat':
            addMessage('jarvis', interpretation.response_text);
            break;
        
        case 'technical_command':
            addMessage('jarvis', `Baik, menjalankan perintah: ${interpretation.command}`);
            statusBar.textContent = 'Menjalankan perintah di WSL...';
            const result = await executeTechnicalCommand(interpretation.command);
            addMessage('jarvis', `Hasil:\n\n${result.output}`);
            break;
        
        case 'error':
            addMessage('jarvis', interpretation.response_text);
            break;

        default:
            addMessage('jarvis', 'Maaf, saya tidak mengerti format respons dari AI.');
            break;
    }

    statusBar.textContent = 'Siap menerima perintah.';
}

// Event Listeners
sendButton.addEventListener('click', handleUserInput);
userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        handleUserInput();
    }
});

// Pesan selamat datang
window.onload = () => {
    addMessage('jarvis', 'Selamat datang. Saya JARVIS. Silakan berikan perintah Anda. Pastikan Execution Engine di WSL sudah berjalan.');
    statusBar.textContent = 'Siap menerima perintah.';
};
