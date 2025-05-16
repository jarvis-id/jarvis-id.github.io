document.addEventListener('DOMContentLoaded', function() {
    const protectedPages = ['index.html', 'view.html', 'input.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage)) {
        if (localStorage.getItem('isAuthenticated') !== 'true') {
            window.location.href = 'login.html';
            return;
        }
        
        // Tambahkan tombol logout secara dinamis
        addLogoutButton();
    }
    
    if (currentPage === 'login.html' && localStorage.getItem('isAuthenticated') === 'true') {
        window.location.href = 'index.html';
    }
});

function addLogoutButton() {
    // Cek apakah tombol sudah ada
    if (document.getElementById('logoutBtn')) return;
    
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.className = 'logout-btn';
    logoutBtn.textContent = 'Keluar';
    
    const logoutContainer = document.createElement('div');
    logoutContainer.className = 'logout-container';
    logoutContainer.appendChild(logoutBtn);
    
    // Tempatkan tombol di header
    const header = document.querySelector('.container h1');
    if (header) {
        header.parentNode.insertBefore(logoutContainer, header.nextSibling);
    }
    
    // Tambahkan event listener
    logoutBtn.addEventListener('click', function() {
        if (confirm('Apakah Anda yakin ingin keluar?')) {
            showLoading();
            setTimeout(() => {
                localStorage.removeItem('isAuthenticated');
                window.location.href = 'login.html';
            }, 500);
        }
    });
}

function showLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(loadingDiv);
}