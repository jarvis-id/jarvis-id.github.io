// Fungsi untuk memformat tanggal
function formatDate(dateString) {
    if (!dateString) return '-';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

// Fungsi untuk memformat mata uang
function formatCurrency(amount) {
    if (isNaN(amount)) return 'Rp0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
}

// Fungsi untuk menghitung total hutang yang belum lunas (uang + barang)
function calculateTotalDebt() {
    const debts = loadDebts();
    return debts.reduce((total, debt) => {
        if (!debt.paid) {
            const amount = parseFloat(debt.amount) || 0;
            return total + amount;
        }
        return total;
    }, 0);
}

// Fungsi untuk memuat data utang
function loadDebts() {
    try {
        return JSON.parse(localStorage.getItem('debts')) || [];
    } catch (error) {
        console.error('Gagal memuat utang:', error);
        return [];
    }
}

// Fungsi untuk menghapus data utang
function deleteDebt(id) {
    let debts = loadDebts();
    debts = debts.filter(debt => debt.id !== id);
    localStorage.setItem('debts', JSON.stringify(debts));
    renderDebtList();
}

// Fungsi untuk menandai utang sebagai lunas
function markAsPaid(id) {
    let debts = loadDebts();
    const debtIndex = debts.findIndex(debt => debt.id === id);
    if (debtIndex !== -1) {
        debts[debtIndex].paid = true;
        debts[debtIndex].paidAt = new Date().toISOString();
        localStorage.setItem('debts', JSON.stringify(debts));
        renderDebtList();
    }
}

// Fungsi untuk merender daftar utang (versi mobile-friendly)
function renderDebtList() {
    const debts = loadDebts();
    const debtListBody = document.getElementById('debtListBody');
    const totalDebtCell = document.getElementById('totalDebtCell');

    if (!debtListBody) {
        console.error('Element debtListBody tidak ditemukan');
        return;
    }

    debtListBody.innerHTML = '';

    if (debts.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="8" style="text-align: center;">Tidak ada data utang</td>`;
        debtListBody.appendChild(row);
        totalDebtCell.textContent = formatCurrency(0);
        return;
    }

    // Urutkan berdasarkan tanggal jatuh tempo (terdekat dulu)
    debts.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    debts.forEach(debt => {
        const row = document.createElement('tr');
        if (debt.paid) {
            row.style.opacity = '0.6';
            row.style.textDecoration = 'line-through';
        }

        const dueDate = new Date(debt.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let status = '';
        let statusClass = '';
        if (debt.paid) {
            status = 'Lunas';
            statusClass = 'paid';
        } else if (dueDate < today) {
            status = 'Terlambat';
            statusClass = 'overdue';
        } else {
            status = 'Belum Lunas';
            statusClass = 'unpaid';
        }

        row.innerHTML = `
            <td data-label="Jenis">${debt.type === 'uang' ? 'Uang' : 'Barang'}</td>
            <td data-label="Deskripsi">${debt.description || '-'}</td>
            <td data-label="Jumlah/Nilai">${formatCurrency(debt.amount)}</td>
            <td data-label="Pemberi Utang">${debt.creditor || '-'}</td>
            <td data-label="Tanggal">${formatDate(debt.date)}</td>
            <td data-label="Jatuh Tempo">${formatDate(debt.dueDate)}</td>
            <td class="${statusClass}" data-label="Status">${status}</td>
            <td class="actions" data-label="Aksi">
                ${!debt.paid ? `<button onclick="markAsPaid('${debt.id}')">Lunas</button>` : ''}
                <button class="delete-btn" onclick="deleteDebt('${debt.id}')">Hapus</button>
            </td>
        `;

        debtListBody.appendChild(row);
    });

    totalDebtCell.textContent = formatCurrency(calculateTotalDebt());
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

// Event listener untuk tombol izin notifikasi
document.getElementById('requestNotificationBtn').addEventListener('click', requestNotificationPermission);

// Fungsi untuk menyesuaikan tampilan tabel di mobile
function adjustTableForMobile() {
    const container = document.getElementById('debtListContainer');
    if (window.innerWidth <= 600) {
        container.classList.add('mobile-view');
    } else {
        container.classList.remove('mobile-view');
    }
}

// Inisialisasi saat DOM siap
document.addEventListener('DOMContentLoaded', function() {
    if (Notification.permission === 'granted') {
        document.getElementById('notificationPermission').style.display = 'none';
        registerServiceWorker();
    }
    
    renderDebtList();
    adjustTableForMobile();
    
    // Tambahkan event listener untuk resize window
    window.addEventListener('resize', adjustTableForMobile);
});