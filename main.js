// main.js (Versi Client-Side untuk GitHub Pages - DIPERBAIKI)

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

// Fungsi utama yang telah diperbaiki
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

    // === PERUBAHAN DI SINI ===
    // URL endpoint diubah dari v1beta menjadi v1 untuk mendukung model terbaru
    const API_URL = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

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

        const result = await response.json(); // Baca respons JSON di awal

        if (!response.ok) {
            // Jika ada error, tampilkan pesan dari respons API
            const errorMessage = result.error?.message || `Status: ${response.status}`;
            throw new Error(`Google AI merespons dengan error! ${errorMessage}`);
        }
        
        // Ekstrak teks dari struktur respons Google AI
        // Ditambahkan pengecekan untuk mencegah error jika respons tidak sesuai format
        const jarvisText = result.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, saya tidak menerima respons yang valid.";
        addMessage('jarvis', jarvisText);

    } catch (error) {
        console.error('Gagal terhubung ke Google AI:', error);
        addMessage('jarvis', `Error: Tidak dapat terhubung ke Google AI.\n\nDetail: ${error.message}`);
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
