const CORRECT_PASSWORD = "vendetta25";

document.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem('isAuthenticated') === 'true') {
        window.location.href = 'index.html';
    }

    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const password = document.getElementById('password').value;
        
        if (password === CORRECT_PASSWORD) {
            showLoading();
            localStorage.setItem('isAuthenticated', 'true');
            setTimeout(() => window.location.href = 'index.html', 800);
        } else {
            errorMessage.textContent = 'Password salah! Silakan coba lagi.';
            loginForm.reset();
            document.getElementById('password').focus();
        }
    });
});

function showLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(loadingDiv);
}