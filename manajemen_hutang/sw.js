const CACHE_NAME = 'debt-manager-v1';
const CACHE_ASSETS = [
  '/manajemen-utang/',
  '/manajemen-utang/index.html',
  '/manajemen-utang/assets/css/styles.css',
  '/manajemen-utang/assets/js/app.js',
  '/manajemen-utang/assets/images/icon.png',
  '/manajemen-utang/assets/images/badge.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(CACHE_ASSETS);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

self.addEventListener('message', event => {
  if (event.data.type === 'NEW_DEBT') {
    scheduleDebtReminder(event.data.debt);
  } else if (event.data.type === 'SCHEDULE_REMINDERS') {
    event.data.debts.forEach(debt => {
      scheduleDebtReminder(debt);
    });
  }
});

function scheduleDebtReminder(debt) {
  if (!debt.paid) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const dueDate = new Date(debt.dueDate);
    if (dueDate < now) {
      showNotification(debt);
      return;
    }
    
    for (let monthOffset = 0; monthOffset <= 1; monthOffset++) {
      [15, 25].forEach(day => {
        const notificationDate = new Date(currentYear, currentMonth + monthOffset, day, 10, 0, 0);
        
        if (notificationDate <= dueDate && notificationDate > now) {
          const timeUntilNotification = notificationDate.getTime() - now.getTime();
          
          setTimeout(() => {
            showNotification(debt);
          }, timeUntilNotification);
        }
      });
    }
  }
}

function showNotification(debt) {
  const title = 'Pengingat Utang';
  const options = {
    body: `Anda memiliki utang ${debt.type === 'uang' ? 'uang sebesar ' + new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(debt.amount) : 'barang: ' + debt.description} kepada ${debt.creditor}. Jatuh tempo: ${new Date(debt.dueDate).toLocaleDateString('id-ID')}`,
    icon: '/manajemen-utang/assets/images/icon.png',
    badge: '/manajemen-utang/assets/images/badge.png',
    vibrate: [200, 100, 200],
    data: {
      debtId: debt.id
    }
  };
  
  self.registration.showNotification(title, options);
}

async function registerPeriodicSync() {
  const registration = await self.registration;
  try {
    await registration.periodicSync.register('debt-reminders', {
      minInterval: 12 * 60 * 60 * 1000
    });
    console.log('Periodic sync terdaftar');
  } catch (error) {
    console.log('Periodic sync tidak didukung:', error);
  }
}

self.addEventListener('activate', event => {
  event.waitUntil(registerPeriodicSync());
});