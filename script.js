// --- Konfigurasi (TIDAK PERLU API KEY) ---

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
            'autoplay': 0,
            'controls': 1
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

// 4. API akan memanggil fungsi ini saat status player berubah
function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.ENDED) {
        playNextVideo();
    }
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (event.data == YT.PlayerState.PLAYING) {
        playPauseBtn.textContent = 'Jeda';
    } else {
        playPauseBtn.textContent = 'Putar';
    }
}

// --- Fungsi Logika Aplikasi ---

/**
 * FUNGSI PENCARIAN BARU - TANPA API
 * Mencari video dengan mengambil halaman hasil pencarian YouTube
 * dan mengambil ID video pertama dari data JSON yang disematkan.
 */
async function searchVideo(query) {
    // Kita butuh proxy untuk menghindari masalah CORS (Cross-Origin Resource Sharing)
    // 'https://cors-anywhere.herokuapp.com/' adalah proxy publik yang umum digunakan.
    const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    
    try {
        const response = await fetch(proxyUrl + searchUrl);
        if (!response.ok) {
            // Jika proxy gagal, coba minta pengguna untuk mengaktifkannya
            if (response.status === 403) {
                 throw new Error("Proxy CORS memerlukan aktivasi. Klik link di pesan error di atas, lalu klik 'Request temporary access', dan coba lagi.");
            }
            throw new Error('Gagal mengambil halaman pencarian YouTube.');
        }
        const htmlText = await response.text();
        
        // Cari data JSON yang disematkan di dalam halaman HTML
        const a = htmlText.indexOf("var ytInitialData = ") + "var ytInitialData = ".length;
        const b = htmlText.indexOf(";</script>", a);
        const jsonString = htmlText.substring(a, b);
        const data = JSON.parse(jsonString);

        // Arahkan ke daftar video
        const videos = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents;
        
        // Temukan video pertama yang valid
        let firstVideo = null;
        for (let item of videos) {
            if (item.videoRenderer && item.videoRenderer.videoId) {
                firstVideo = item.videoRenderer;
                break;
            }
        }
        
        if (!firstVideo) {
            throw new Error('Tidak ada video yang ditemukan dalam hasil pencarian.');
        }

        // Kembalikan objek yang strukturnya mirip dengan hasil API
        return {
            id: { videoId: firstVideo.videoId },
            snippet: {
                title: firstVideo.title.runs[0].text,
                channelTitle: firstVideo.ownerText.runs[0].text
            }
        };

    } catch (error) {
        console.error('Search Error:', error);
        if (error.message.includes("Proxy CORS")) {
             addChatMessage("Aktivasi Proxy Diperlukan: Buka https://cors-anywhere.herokuapp.com/corsdemo lalu klik tombol 'Request temporary access to the demo server'. Setelah itu, coba lagi cari lagu di sini.", 'error');
        } else {
            addChatMessage(`Error pencarian: ${error.message}`, 'error');
        }
        return null;
    }
}


function addVideoToQueue(videoData) {
    queue.push(videoData);
    updateQueueUI();
    addChatMessage(`"${videoData.snippet.title}" ditambahkan ke antrian.`, 'system');

    const playerState = player.getPlayerState();
    if (playerState === YT.PlayerState.UNSTARTED || playerState === YT.PlayerState.ENDED || currentVideoIndex === -1) {
        playVideoFromQueue(0); // Selalu mulai dari awal jika antrian kosong
    } else if (queue.length === 1) { // Jika ini lagu pertama yg ditambahkan
        playVideoFromQueue(0);
    }
}


function playVideoFromQueue(index) {
    if (index < 0 || index >= queue.length) {
        addChatMessage('Antrian selesai.', 'system');
        updateNowPlayingUI(null);
        currentVideoIndex = -1;
        if(player) player.stopVideo();
        return;
    }
    currentVideoIndex = index;
    const video = queue[currentVideoIndex];
    player.loadVideoById(video.id.videoId);
    updateNowPlayingUI(video);
    updateQueueUI();
}

function playNextVideo() {
    // Jika tidak ada lagu yg sedang diputar, mulai dari awal
    if(currentVideoIndex === -1 && queue.length > 0) {
      playVideoFromQueue(0);
    } else {
      playVideoFromQueue(currentVideoIndex + 1);
    }
}

// --- Fungsi Kontrol UI (tetap sama) ---

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
        e.target.value = '';
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
    queueList.innerHTML = '';
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
