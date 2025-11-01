// main.js (Versi Final untuk GitHub Pages)

// Elemen DOM
const chatLog = document.getElementById('chat-log');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const statusBar = document.getElementById('status-bar');
const geminiModelInput = document.getElementById('gemini-model');
const apiKeyInput = document.getElementById('api-key');

// Fungsi untuk Text-to-Speech
function speak(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
}

// Fungsi untuk menambah pesan ke log
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

// Fungsi utama untuk menangani input pengguna
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

    // URL endpoint yang benar menggunakan v1 untuk mendukung model terbaru
    const API_URL = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

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

        const result = await response.json();

        if (!response.ok) {
            const errorMessage = result.error?.message || `Respons tidak valid dengan Status: ${response.status}`;
            throw new Error(`Google AI merespons dengan error! ${errorMessage}`);
        }
        
        const jarvisText = result.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, saya tidak menerima respons yang valid dari AI.";
        addMessage('jarvis', jarvisText);

    } catch (error) {
        console.error('Gagal terhubung ke Google AI:', error);
        addMessage('jarvis', `Error: Tidak dapat terhubung ke Google AI.\n\nDetail: ${error.message}`);
    }
    statusBar.textContent = 'Siap menerima perintah.';
}

// Event Listeners
sendButton.addEventListener('click', handleUserInput);
userInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') handleUserInput(); });

// Pesan selamat datang
window.onload = () => {
    addMessage('jarvis', 'Selamat datang. Saya JARVIS. Silakan pilih model, masukkan API Key, lalu berikan perintah Anda.');
    statusBar.textContent = 'Siap menerima perintah.';
};
