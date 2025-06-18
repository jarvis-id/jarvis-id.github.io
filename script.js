// --- Konfigurasi ---
const clientId = '910c59b710924f06a0745c6ee6f4e472';
const spotifyAuthEndpoint = 'https://accounts.spotify.com/authorize';
const spotifyTokenEndpoint = 'https://accounts.spotify.com/api/token';
const scopes = [
    'user-read-private', 
    'user-read-email', 
    'user-modify-playback-state', 
    'streaming'
];

let accessToken = '';
let player;
let queue = []; // Antrian lokal untuk tampilan UI
let currentDeviceId = null;
let isPlaying = false;
let currentTrack = null; // Menyimpan data lagu yang sedang diputar

// --- Fungsi Helper untuk Autentikasi PKCE (Tetap sama) ---
function generateRandomString(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// --- Alur Otentikasi (Tetap sama) ---
document.getElementById('loginBtn').addEventListener('click', async () => {
    const codeVerifier = generateRandomString(128);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    sessionStorage.setItem('code_verifier', codeVerifier);
    const redirectUri = window.location.origin + window.location.pathname;
    const params = new URLSearchParams({
        response_type: 'code', client_id: clientId, scope: scopes.join(' '),
        redirect_uri: redirectUri, code_challenge_method: 'S256',
        code_challenge: codeChallenge, show_dialog: 'true'
    });
    window.location.href = `${spotifyAuthEndpoint}?${params.toString()}`;
});

async function getAccessToken(clientId, code) {
    const codeVerifier = sessionStorage.getItem('code_verifier');
    const redirectUri = window.location.origin + window.location.pathname;
    const response = await fetch(spotifyTokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code', code: code, redirect_uri: redirectUri,
            client_id: clientId, code_verifier: codeVerifier,
        }),
    });
    if (!response.ok) throw new Error('Failed to get access token.');
    const data = await response.json();
    localStorage.setItem('spotify_access_token', data.access_token);
    return data.access_token;
}

// --- Logika Utama Aplikasi (Tetap sama) ---
async function main() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
        try {
            accessToken = await getAccessToken(clientId, code);
            window.history.replaceState({}, document.title, window.location.pathname);
            initializeUI();
        } catch (error) {
            console.error(error);
            addChatMessage('Gagal autentikasi.', 'error');
        }
    } else {
        accessToken = localStorage.getItem('spotify_access_token');
        if (accessToken) {
            initializeUI();
        } else {
            document.getElementById('loginBtn').style.display = 'block';
        }
    }
}

function initializeUI() {
    document.getElementById('loginBtn').style.display = 'none';
    addChatMessage('Berhasil terhubung! Menyiapkan player...', 'system');
    initializePlayer();
}

// --- Logika Player Spotify ---
function initializePlayer() {
    window.onSpotifyWebPlaybackSDKReady = () => {
        player = new Spotify.Player({
            name: 'Sukehigland Web Player',
            getOAuthToken: cb => { cb(accessToken); },
            volume: 0.5
        });

        player.addListener('ready', ({ device_id }) => {
            currentDeviceId = device_id;
            document.getElementById('playPauseBtn').disabled = false;
            document.getElementById('skipBtn').disabled = false;
            addChatMessage('Player siap. Tambahkan lagu dengan [!play].', 'system');
            transferPlayback(device_id);
        });

        // ============================================================== //
        // === PERUBAHAN UTAMA: Logika auto-advance dan hapus antrian === //
        // ============================================================== //
        player.addListener('player_state_changed', (state) => {
            if (!state) {
                // Player tidak aktif, mungkin terputus
                currentTrack = null;
                isPlaying = false;
                updateNowPlayingUI(null);
                document.getElementById('playPauseBtn').textContent = 'Putar';
                return;
            }

            const newTrack = state.track_window.current_track;
            isPlaying = !state.paused;

            // Cek jika lagu telah berganti
            if (newTrack && (!currentTrack || newTrack.uri !== currentTrack.uri)) {
                // Lagu baru telah dimulai.
                
                // Jika ada lagu sebelumnya, hapus dari antrian LOKAL kami
                if (currentTrack) {
                    // Cari lagu yang baru saja selesai di antrian lokal kita
                    const finishedTrackIndex = queue.findIndex(track => track.uri === currentTrack.uri);
                    if (finishedTrackIndex > -1) {
                        // Hapus lagu tersebut dari array
                        queue.splice(finishedTrackIndex, 1);
                    }
                }
                
                // Perbarui UI antrian setelah menghapus
                updateQueueUI();
            }
            
            // Perbarui status saat ini
            currentTrack = newTrack;
            updateNowPlayingUI(currentTrack);
            document.getElementById('playPauseBtn').textContent = isPlaying ? 'Jeda' : 'Putar';
        });
        
        player.addListener('authentication_error', ({ message }) => {
            console.error('Auth error:', message);
            addChatMessage('Sesi habis. Refresh & login kembali.', 'error');
            localStorage.removeItem('spotify_access_token');
            document.getElementById('loginBtn').style.display = 'block';
        });

        player.connect();
    };
    if (window.Spotify && !player) window.onSpotifyWebPlaybackSDKReady();
}

async function transferPlayback(deviceId) {
    await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_ids: [deviceId], play: false }),
    });
}

async function searchTrack(query) {
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) throw new Error('Gagal mencari lagu.');
    const data = await response.json();
    return data.tracks.items[0] || null;
}

// ====================================================== //
// === PERUBAHAN KEDUA: Logika auto-play saat menambah === //
// ====================================================== //
async function addTrackToQueue(track) {
    // Tambahkan lagu ke antrian Spotify
    await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${track.uri}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    // Tambahkan juga ke antrian lokal untuk UI
    queue.push(track); 
    updateQueueUI();
    addChatMessage(`"${track.name}" ditambahkan ke antrian.`, 'system');
    
    // LOGIKA AUTO-PLAY: Jika tidak ada lagu yang sedang diputar, mulai putar
    if (!isPlaying) {
        // Panggil endpoint 'next' agar Spotify mulai memutar lagu pertama dari antriannya
        await skipTrack();
    }
}

async function playTrack(uri) {
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${currentDeviceId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: [uri] }),
    });
}

async function skipTrack() {
    await fetch(`https://api.spotify.com/v1/me/player/next`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
}

async function togglePlayPause() {
    if (!currentTrack) return; // Jangan lakukan apa-apa jika tidak ada lagu
    const endpoint = isPlaying ? 'pause' : 'play';
    await fetch(`https://api.spotify.com/v1/me/player/${endpoint}?device_id=${currentDeviceId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
}


// --- Fungsi Kontrol UI (Tetap sama) ---
document.getElementById('chatInput').addEventListener('keypress', async (e) => {
    if (e.key === 'Enter' && e.target.value.trim() !== '') {
        const command = e.target.value.trim();
        if (command.toLowerCase().startsWith('!play ')) {
            const query = command.substring(6);
            addChatMessage(`Mencari: ${query}...`, 'system');
            const track = await searchTrack(query);
            if (track) await addTrackToQueue(track);
            else addChatMessage('Lagu tidak ditemukan.', 'error');
        } else if (command.toLowerCase() === '!skip') {
            addChatMessage('Melewati lagu...', 'system');
            await skipTrack();
        }
        e.target.value = '';
    }
});
document.getElementById('skipBtn').addEventListener('click', skipTrack);
document.getElementById('playPauseBtn').addEventListener('click', togglePlayPause);

function updateNowPlayingUI(track) {
    const titleEl = document.getElementById('currentSongTitle');
    const artistEl = document.getElementById('currentSongArtist');
    const albumArtEl = document.getElementById('albumArt');
    
    if (track) {
        titleEl.textContent = track.name;
        artistEl.textContent = track.artists.map(a => a.name).join(', ');
        albumArtEl.style.backgroundImage = `url(${track.album.images[0].url})`;
        // Tandai lagu yang sedang diputar di daftar antrian
        updateQueueUI(); 
    } else {
        titleEl.textContent = 'Tidak ada lagu yang diputar';
        artistEl.textContent = '';
        albumArtEl.style.backgroundImage = 'none';
    }
}

function updateQueueUI() {
    const queueList = document.getElementById('queueList');
    queueList.innerHTML = '';
    queue.forEach((track) => {
        const li = document.createElement('li');
        li.className = 'queue-item';
        // Tandai lagu yang sedang diputar berdasarkan `currentTrack`
        if (currentTrack && track.uri === currentTrack.uri) {
            li.classList.add('playing');
        }
        li.innerHTML = `
            <div class="queue-item-info">
                <strong>${track.name}</strong>
                <small>${track.artists.map(a => a.name).join(', ')}</small>
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

// Panggil fungsi utama saat halaman dimuat
main();
