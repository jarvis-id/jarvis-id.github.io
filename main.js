// Konfigurasi Utama
const BACKEND_URL = 'http://localhost:5000/process';

// Elemen DOM
const chatLog = document.getElementById('chat-log');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const statusBar = document.getElementById('status-bar');

// Fungsi untuk menambah pesan ke log (tetap sama)
function addMessage(sender, text) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    const preElement = document.createElement('pre');
    preElement.textContent = text;
    messageElement.appendChild(preElement);
    chatLog.insertBefore(messageElement, chatLog.firstChild);
    chatLog.scrollTop = 0;
}

// Fungsi utama untuk menangani input pengguna
async function handleUserInput() {
    const userText = userInput.value.trim();
    if (userText === '') return;

    addMessage('user', userText);
    userInput.value = '';
    statusBar.textContent = 'Menghubungi JARVIS Engine...';

    try {
        // Kirim teks mentah ke backend untuk diproses
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: userText })
        });

        if (!response.ok) {
            throw new Error(`Server merespons dengan error! Status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Tampilkan respons dari backend, apa pun jenisnya
        addMessage('jarvis', result.content);

    } catch (error) {
        console.error('Gagal terhubung ke JARVIS Engine:', error);
        addMessage('jarvis', 'Error: Tidak dapat terhubung ke JARVIS Engine di WSL. Pastikan skrip `engine.py` sudah berjalan.');
    }
    
    statusBar.textContent = 'Siap menerima perintah.';
}

// Event Listeners (tetap sama)
sendButton.addEventListener('click', handleUserInput);
userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        handleUserInput();
    }
});

// Pesan selamat datang (tetap sama)
window.onload = () => {
    addMessage('jarvis', 'Selamat datang. Saya JARVIS. Silakan berikan perintah Anda. Pastikan Execution Engine di WSL sudah berjalan.');
    statusBar.textContent = 'Siap menerima perintah.';
};
