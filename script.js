// --- Konfigurasi ---
// GANTI placeholder di bawah ini dengan API Key BARU yang sudah Anda buat dan amankan.
const YOUTUBE_API_KEY = 'AIzaSyBZnA2vpnWzYBfQWjgit222oJTPH-ChxQw'; 

// --- Variabel Global ---
let player; // Instance YouTube Player
let queue = []; // Antrian lagu kita (berisi objek video)
let currentVideoIndex = -1; // Indeks video yang sedang diputar di antrian

// 1. Memuat YouTube IFrame Player API
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// 2. Fungsi ini akan dipanggil otomatis saat API YouTube siap
function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        playerVars: {
            'playsinline': 1,
            'autoplay': 0, // Jangan autoplay saat load pertama
            'controls': 1  // Tampilkan kontrol bawaan YouTube
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

// 3. API akan memanggil fungsi ini saat player siap
function onPlayerReady(event) {
    addChatMessage("Player YouTube siap. Silakan tambahkan lagu.", 'system');
    document.getElementById('playPauseBtn').disabled = false;
    document.getElementById('skipBtn').disabled = false;
}

// 4. API akan memanggil fungsi ini saat status player berubah (play, pause, selesai, dll)
function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.ENDED) {
        // Jika video selesai, putar video berikutnya di antrian
        playNextVideo();
    }
    // Update tombol play/pause
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (event.data == YT.PlayerState.PLAYING) {
        playPauseBtn.textContent = 'Jeda';
    } else {
        playPauseBtn.textContent = 'Putar';
    }
}

// --- Fungsi Logika Aplikasi ---

async function searchVideo(query) {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}&type=video&maxResults=1`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            if (errorData.error.message.includes('API key not valid')) {
                 throw new Error('API Key tidak valid. Pastikan Anda sudah menggantinya di script.js.');
            }
            throw new Error('Gagal mencari video. Cek API Key dan batasannya.');
        }
        const data = await response.json();
        if (!data.items || data.items.length === 0) {
            throw new Error('Lagu tidak ditemukan di YouTube.');
        }
        return data.items[0]; // Mengembalikan objek video pertama
    } catch (error) {
        console.error('Search Error:', error);
        addChatMessage(error.message, 'error');
        return null;
    }
}

function addVideoToQueue(videoData) {
    queue.push(videoData);
    updateQueueUI();
    addChatMessage(`"${videoData.snippet.title}" ditambahkan ke antrian.`, 'system');

    // Jika ini adalah lagu pertama yang ditambahkan dan tidak ada yang sedang diputar, mulai mainkan
    const playerState = player.getPlayerState();
    if (playerState === YT.PlayerState.UNSTARTED || playerState === YT.PlayerState.CUED || currentVideoIndex === -1) {
        playVideoFromQueue(queue.length - 1);
    }
}

function playVideoFromQueue(index) {
    if (index < 0 || index >= queue.length) {
        addChatMessage('Antrian selesai.', 'system');
        updateNowPlayingUI(null);
        currentVideoIndex = -1;
        if(player) player.stopVideo(); // Hentikan video jika antrian habis
        return;
    }
    currentVideoIndex = index;
    const video = queue[currentVideoIndex];
    player.loadVideoById(video.id.videoId);
    updateNowPlayingUI(video);
    updateQueueUI();
}

function playNextVideo() {
    playVideoFromQueue(currentVideoIndex + 1);
}

// --- Fungsi Kontrol UI ---

document.getElementById('chatInput').addEventListener('keypress', async (e) => {
    if (e.key === 'Enter' && e.target.value.trim() !== '') {
        const command = e.target.value.trim();
        if (command.toLowerCase().startsWith('!play ')) {
            const query = command.substring(6);
            addChatMessage(`Mencari: ${query}...`, 'system');
            const video = await searchVideo(query);
            if (video) {
                addVideoToQueue(video);
            }
        } else if (command.toLowerCase() === '!skip') {
            addChatMessage('Melewati lagu...', 'system');
            playNextVideo();
        }
        e.target.value = ''; // Kosongkan input
    }
});

document.getElementById('skipBtn').addEventListener('click', playNextVideo);

document.getElementById('playPauseBtn').addEventListener('click', () => {
    if (!player || currentVideoIndex === -1) return;
    const playerState = player.getPlayerState();
    if (playerState === YT.PlayerState.PLAYING) {
        player.pauseVideo();
    } else {
        player.playVideo();
    }
});

function updateNowPlayingUI(video) {
    const titleEl = document.getElementById('currentSongTitle');
    const artistEl = document.getElementById('currentSongArtist');
    
    if (video) {
        titleEl.textContent = video.snippet.title;
        artistEl.textContent = video.snippet.channelTitle;
    } else {
        titleEl.textContent = 'Tidak ada lagu yang diputar';
        artistEl.textContent = '';
    }
}

function updateQueueUI() {
    const queueList = document.getElementById('queueList');
    queueList.innerHTML = ''; // Kosongkan daftar
    queue.forEach((video, index) => {
        const li = document.createElement('li');
        li.className = 'queue-item';
        if (index === currentVideoIndex) {
            li.classList.add('playing');
        }
        li.innerHTML = `
            <div class="queue-item-info">
                <strong>${video.snippet.title}</strong>
                <small>${video.snippet.channelTitle}</small>
            </div>
        `;
        queueList.appendChild(li);
    });
}

function addChatMessage(message, type = 'system') {
    const chatMessages = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', type);
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
