// Fungsi untuk menyimpan data utang
function saveDebt(debt) {
    try {
        let debts = JSON.parse(localStorage.getItem('debts')) || [];
        debt.id = Date.now().toString();
        debt.createdAt = new Date().toISOString();
        debts.push(debt);
        localStorage.setItem('debts', JSON.stringify(debts));
        return true;
    } catch (error) {
        console.error('Gagal menyimpan utang:', error);
        return false;
    }
}

// Fungsi untuk meminta izin notifikasi
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                document.getElementById('notificationPermission').style.display = 'none';
                console.log('Izin notifikasi diberikan');
                registerServiceWorker();
            } else {
                console.log('Izin notifikasi ditolak');
            }
        });
    }
}

// Fungsi untuk mendaftarkan Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/manajemen-utang/sw.js')
            .then(registration => {
                console.log('ServiceWorker registered with scope:', registration.scope);
            })
            .catch(err => {
                console.log('ServiceWorker registration failed:', err);
            });
    }
}

// Event listener untuk form
document.getElementById('debtForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const debt = {
        type: document.getElementById('debtType').value,
        description: document.getElementById('description').value,
        amount: parseFloat(document.getElementById('amount').value) || 0,
        creditor: document.getElementById('creditor').value,
        date: document.getElementById('date').value,
        dueDate: document.getElementById('dueDate').value,
        notes: document.getElementById('notes').value,
        paid: false
    };

    if (saveDebt(debt)) {
        this.reset();
        alert('Utang berhasil disimpan!');
    } else {
        alert('Gagal menyimpan utang!');
    }
});

// Event listener untuk tombol izin notifikasi
document.getElementById('requestNotificationBtn').addEventListener('click', requestNotificationPermission);

// Inisialisasi saat DOM siap
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    document.getElementById('dueDate').value = dueDate.toISOString().split('T')[0];

    if (Notification.permission === 'granted') {
        document.getElementById('notificationPermission').style.display = 'none';
        registerServiceWorker();
    }
});
