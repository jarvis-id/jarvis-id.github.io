// --- Konfigurasi ---
const clientId = '910c59b710924f06a0745c6ee6f4e472'; // Client ID Anda
const spotifyAuthEndpoint = 'https://accounts.spotify.com/authorize';
const spotifyTokenEndpoint = 'https://accounts.spotify.com/api/token';
const scopes = ['user-read-private', 'user-read-email', 'user-modify-playback-state', 'streaming'];

// --- Fungsi Helper untuk PKCE ---

// 1. Membuat code_verifier: string acak
function generateRandomString(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// 2. Membuat code_challenge dari code_verifier
async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// --- Alur Autentikasi ---

// Fungsi untuk handle login
document.getElementById('loginBtn').addEventListener('click', async () => {
    const codeVerifier = generateRandomString(128);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Simpan codeVerifier di browser untuk digunakan nanti saat menukar token
    window.sessionStorage.setItem('code_verifier', codeVerifier);

    const redirectUri = window.location.origin + window.location.pathname;
    
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope: scopes.join(' '),
        redirect_uri: redirectUri,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        show_dialog: 'true'
    });
    
    window.location.href = `${spotifyAuthEndpoint}?${params.toString()}`;
});

// Fungsi untuk menukar code dengan access token
async function getAccessToken(clientId, code) {
    const codeVerifier = sessionStorage.getItem('code_verifier');
    if (!codeVerifier) {
        throw new Error("Code verifier tidak ditemukan.");
    }

    const redirectUri = window.location.origin + window.location.pathname;

    const response = await fetch(spotifyTokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            client_id: clientId,
            code_verifier: codeVerifier,
        }),
    });

    if (!response.ok) {
        const errorDetails = await response.json();
        console.error('Token exchange error:', errorDetails);
        throw new Error('Gagal mendapatkan access token.');
    }

    const data = await response.json();
    // Simpan token di local storage untuk sesi berikutnya
    localStorage.setItem('spotify_access_token', data.access_token);
    localStorage.setItem('spotify_refresh_token', data.refresh_token);
    localStorage.setItem('spotify_token_expires_at', Date.now() + data.expires_in * 1000);

    return data.access_token;
}


// --- Logika Aplikasi ---

let accessToken = '';
let player; // Variabel untuk menyimpan instance player

// Fungsi utama yang berjalan saat halaman dimuat
async function main() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    // Cek apakah ada 'code' dari redirect Spotify
    if (code) {
        try {
            accessToken = await getAccessToken(clientId, code);
            // Hapus parameter 'code' dari URL agar bersih
            window.history.replaceState({}, document.title, window.location.pathname);
            initializeUI();
        } catch (error) {
            console.error('Error:', error);
            addChatMessage('Gagal melakukan autentikasi dengan Spotify.', 'error');
            // Tampilkan kembali tombol login jika gagal
            document.getElementById('loginBtn').style.display = 'block';
        }
    } else {
        // Cek apakah ada token yang tersimpan
        accessToken = localStorage.getItem('spotify_access_token');
        const expiresAt = localStorage.getItem('spotify_token_expires_at');

        if (accessToken && Date.now() < expiresAt) {
            initializeUI();
        } else {
             // Jika tidak ada token atau sudah kadaluarsa, tampilkan tombol login
            document.getElementById('loginBtn').style.display = 'block';
            document.getElementById('playPauseBtn').disabled = true;
            document.getElementById('skipBtn').disabled = true;
        }
    }
}

function initializeUI() {
    // Sembunyikan tombol login dan tampilkan kontrol player
    document.getElementById('loginBtn').style.display = 'none';
    addChatMessage('Berhasil terhubung ke Spotify!', 'system');
    initializePlayer();
}


// Fungsi untuk inisialisasi player Spotify
function initializePlayer() {
    if (!accessToken) return;

    // Pastikan script SDK sudah dimuat (jika belum)
    if (!window.Spotify) {
         // ini akan dipanggil dari index.html, jadi seharusnya sudah ada
         console.error("Spotify SDK belum siap.");
         return;
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
        player = new Spotify.Player({
            name: 'Sukehigland Player',
            getOAuthToken: cb => { cb(accessToken); },
            volume: 0.5
        });

        player.addListener('ready', ({ device_id }) => {
            console.log('Ready with Device ID', device_id);
            document.getElementById('playPauseBtn').disabled = false;
            document.getElementById('skipBtn').disabled = false;
            addChatMessage(`Player siap dengan ID: ${device_id}`, 'system');
        });

        player.addListener('not_ready', ({ device_id }) => {
            console.log('Device ID has gone offline', device_id);
        });
        
        player.addListener('initialization_error', ({ message }) => {
            console.error('Gagal inisialisasi player:', message);
            addChatMessage(`Error player: ${message}`, 'error');
        });

        player.addListener('authentication_error', ({ message }) => {
            console.error('Gagal autentikasi player:', message);
            addChatMessage(`Error autentikasi: ${message}`, 'error');
            // Mungkin perlu proses refresh token di sini di masa depan
        });
        
        player.addListener('account_error', ({ message }) => {
            console.error('Error akun:', message);
            addChatMessage(`Error akun (butuh premium): ${message}`, 'error');
        });

        player.connect().then(success => {
            if (success) {
                console.log('The Web Playback SDK successfully connected to Spotify!');
            }
        });
    };
    
    // Jika onSpotifyWebPlaybackSDKReady sudah terpanggil sebelumnya
    if (window.Spotify && !player) {
      window.onSpotifyWebPlaybackSDKReady();
    }
}

// Fungsi searchTrack (tetap sama)
async function searchTrack(query) {
    if (!accessToken) {
        addChatMessage('Harap login terlebih dahulu.', 'error');
        return null;
    }
    try {
        const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Gagal mencari lagu');
        }
        const data = await response.json();
        if (!data.tracks?.items?.length) {
            throw new Error('Lagu tidak ditemukan');
        }
        return data.tracks.items[0];
    } catch (error) {
        console.error('Search error:', error);
        addChatMessage(`Error: ${error.message}`, 'error');
        return null;
    }
}

// Fungsi untuk menambahkan pesan chat (tetap sama)
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
