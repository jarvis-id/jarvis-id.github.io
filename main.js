// main.js (Versi Client-Side untuk GitHub Pages)

// --- TIDAK ADA LAGI BACKEND_URL ---

// Elemen DOM
const chatLog = document.getElementById('chat-log');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const statusBar = document.getElementById('status-bar');
const geminiModelInput = document.getElementById('gemini-model');
const apiKeyInput = document.getElementById('api-key');

// Fungsi untuk Text-to-Speech (tetap sama)
function speak(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
}

// Fungsi untuk menambah pesan ke log (tetap sama)
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

// --- FUNGSI UTAMA DIMODIFIKASI SECARA SIGNIFIKAN ---
async function handleUserInput() {
    const userText = userInput.value.trim();
    const model = geminiModelInput.value;
    const apiKey = apiKeyInput.value.trim();

    if (userText === '') return;

    if (model === '' || apiKey === '') {
        addMessage('jarvis', 'Error: Silakan pilih Model AI dan masukkan API Key Anda terlebih dahulu.');
        return;
    }

    addMessage('user', userText);
    userInput.value = '';
    statusBar.textContent = 'Menghubungi Google AI...';

    // URL endpoint untuk Google AI Gemini REST API
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Struktur body request yang dibutuhkan oleh Google AI API
    const requestBody = {
        contents: [{
            parts: [{
                text: userText
            }]
        }]
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(`Google AI merespons dengan error! Status: ${response.status}. Pesan: ${errorResult.error.message}`);
        }

        const result = await response.json();
        
        // Ekstrak teks dari struktur respons Google AI
        const jarvisText = result.candidates[0].content.parts[0].text;
        addMessage('jarvis', jarvisText);

    } catch (error) {
        console.error('Gagal terhubung ke Google AI:', error);
        addMessage('jarvis', `Error: Tidak dapat terhubung ke Google AI. Pastikan API Key valid dan coba lagi.\n\nDetail: ${error.message}`);
    }
    statusBar.textContent = 'Siap menerima perintah.';
}

// Event Listeners (tetap sama)
sendButton.addEventListener('click', handleUserInput);
userInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') handleUserInput(); });

// Pesan selamat datang (tetap sama)
window.onload = () => {
    addMessage('jarvis', 'Selamat datang. Saya JARVIS. Silakan pilih model, masukkan API Key, lalu berikan perintah Anda.');
    statusBar.textContent = 'Siap menerima perintah.';
};
