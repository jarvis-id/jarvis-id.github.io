// --- Tidak Ada Konfigurasi API Key ---

// --- Variabel Global ---
let player;
let queue = [];
let currentVideoIndex = -1;

// 1. Memuat YouTube IFrame Player API
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// 2. Fungsi ini akan dipanggil otomatis saat API YouTube siap
function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-player', {
        height: '100%', width: '100%',
        playerVars: { 'playsinline': 1, 'autoplay': 0, 'controls': 1 },
        events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange }
    });
}

// 3. Dipanggil saat player siap
function onPlayerReady(event) {
    addChatMessage("Player siap.", 'system');
    document.getElementById('playPauseBtn').disabled = false;
    document.getElementById('skipBtn').disabled = false;
}

// 4. Dipanggil saat status player berubah
function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.ENDED) {
        playNextVideo();
    }
    const playPauseBtn = document.getElementById('playPauseBtn');
    playPauseBtn.textContent = event.data == YT.PlayerState.PLAYING ? 'Jeda' : 'Putar';
}

// --- Fungsi Logika Aplikasi ---

async function searchVideo(query) {
    const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    try {
        const response = await fetch(proxyUrl + searchUrl);
        if (response.status === 403) {
             throw new Error("Aktivasi proxy diperlukan. Lihat pesan error di atas.");
        }
        if (!response.ok) throw new Error('Gagal mengambil halaman pencarian.');
        
        const htmlText = await response.text();
        const a = htmlText.indexOf("var ytInitialData = ") + "var ytInitialData = ".length;
        const b = htmlText.indexOf(";</script>", a);
        const jsonString = htmlText.substring(a, b);
        const data = JSON.parse(jsonString);
        const videos = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents;
        
        let firstVideo = videos.find(item => item.videoRenderer && item.videoRenderer.videoId);
        if (!firstVideo) throw new Error('Video tidak ditemukan.');

        return {
            id: { videoId: firstVideo.videoRenderer.videoId },
            snippet: {
                title: firstVideo.videoRenderer.title.runs[0].text,
                channelTitle: firstVideo.videoRenderer.ownerText.runs[0].text
            }
        };
    } catch (error) {
        console.error('Search Error:', error);
        if (error.message.includes("Aktivasi proxy")) {
             addChatMessage("Proxy CORS perlu diaktifkan: Buka https://cors-anywhere.herokuapp.com/corsdemo, klik 'Request temporary access', lalu coba lagi.", 'error');
        } else {
            addChatMessage(`Error pencarian: ${error.message}`, 'error');
        }
        return null;
    }
}

function addVideoToQueue(videoData) {
    queue.push(videoData);
    updateQueueUI();
    addChatMessage(`"${videoData.snippet.title}" ditambahkan.`, 'system');

    const playerState = player.getPlayerState();
    // Jika player diam atau antrian baru saja diisi, mulai putar
    if (playerState === YT.PlayerState.UNSTARTED || playerState === YT.PlayerState.ENDED || currentVideoIndex === -1) {
        playVideoFromQueue(queue.length - 1); // Mainkan lagu yang baru ditambahkan
    }
}


function playVideoFromQueue(index) {
    if (index < 0 || index >= queue.length) {
        addChatMessage('Antrian selesai.', 'system');
        updateNowPlayingUI(null);
        if(player) player.stopVideo();
        currentVideoIndex = -1;
        return;
    }

    currentVideoIndex = index;
    const video = queue[currentVideoIndex];
    player.loadVideoById(video.id.videoId);
    updateNowPlayingUI(video);
    updateQueueUI();
}

function playNextVideo() {
    // Hapus lagu yang baru saja selesai dari antrian
    if(currentVideoIndex > -1) {
        queue.splice(currentVideoIndex, 1);
    }
    // Karena satu elemen dihapus, lagu 'berikutnya' sekarang berada di indeks yang sama
    // dengan lagu yang sedang diputar sebelumnya.
    playVideoFromQueue(currentVideoIndex);
}

// --- Fungsi Kontrol UI ---
document.getElementById('chatInput').addEventListener('keypress', async (e) => {
    if (e.key === 'Enter' && e.target.value.trim() !== '') {
        const command = e.target.value.trim();
        if (command.toLowerCase().startsWith('!play ')) {
            const query = command.substring(6);
            addChatMessage(`Mencari: ${query}...`, 'system');
            const video = await searchVideo(query);
            if (video) addVideoToQueue(video);
        } else if (command.toLowerCase() === '!skip') {
            addChatMessage('Melewati lagu...', 'system');
            playNextVideo();
        }
        e.target.value = '';
    }
});
document.getElementById('skipBtn').addEventListener('click', playNextVideo);
document.getElementById('playPauseBtn').addEventListener('click', () => {
    if (!player || currentVideoIndex === -1) return;
    const playerState = player.getPlayerState();
    if (playerState === YT.PlayerState.PLAYING) player.pauseVideo();
    else player.playVideo();
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
    updateQueueUI();
}

function updateQueueUI() {
    const queueList = document.getElementById('queueList');
    queueList.innerHTML = '';
    queue.forEach((video, index) => {
        const li = document.createElement('li');
        li.className = 'queue-item';
        if (index === currentVideoIndex) li.classList.add('playing');
        li.innerHTML = `<div class="queue-item-info"><strong>${video.snippet.title}</strong><small>${video.snippet.channelTitle}</small></div>`;
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
