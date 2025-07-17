// Lắng nghe sự kiện khi popup được mở
document.addEventListener('DOMContentLoaded', async () => {
  // Kiểm tra xem extension có đang hoạt động trên tab hiện tại không
  checkActiveTab();
  
  // Khởi tạo các cài đặt từ local storage
  initSettings();
  
  // Lắng nghe sự kiện thay đổi cài đặt
  setupEventListeners();
});

// Kiểm tra xem tab hiện tại có phải là Binance không
async function checkActiveTab() {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = activeTab.url || '';
    
    const statusElement = document.getElementById('status');
    const statusTextElement = statusElement.querySelector('.status-text');
    
    if (url.includes('binance.com')) {
      statusElement.classList.add('active');
      statusTextElement.classList.add('active');
      statusTextElement.textContent = 'Extension đang hoạt động trên Binance';
    } else {
      statusElement.classList.remove('active');
      statusTextElement.classList.remove('active');
      statusTextElement.textContent = 'Extension chỉ hoạt động trên Binance';
    }
  } catch (error) {
    console.error('Lỗi khi kiểm tra tab hiện tại:', error);
  }
}

// Khởi tạo các cài đặt từ local storage
async function initSettings() {
  try {
    const settings = await chrome.storage.sync.get({
      autoShowQR: true,
      showTransferInfo: true
    });
    
    document.getElementById('autoShowQR').checked = settings.autoShowQR;
    document.getElementById('showTransferInfo').checked = settings.showTransferInfo;
  } catch (error) {
    console.error('Lỗi khi khởi tạo cài đặt:', error);
  }
}

// Thiết lập các sự kiện lắng nghe
function setupEventListeners() {
  // Lắng nghe sự kiện thay đổi cài đặt tự động hiển thị QR
  document.getElementById('autoShowQR').addEventListener('change', async (event) => {
    try {
      await chrome.storage.sync.set({ autoShowQR: event.target.checked });
      
      // Gửi thông báo đến content script
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, {
          type: 'SETTINGS_CHANGED',
          settings: { autoShowQR: event.target.checked }
        });
      }
    } catch (error) {
      console.error('Lỗi khi lưu cài đặt:', error);
    }
  });
  
  // Lắng nghe sự kiện thay đổi cài đặt hiển thị thông tin chuyển khoản
  document.getElementById('showTransferInfo').addEventListener('change', async (event) => {
    try {
      await chrome.storage.sync.set({ showTransferInfo: event.target.checked });
      
      // Gửi thông báo đến content script
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, {
          type: 'SETTINGS_CHANGED',
          settings: { showTransferInfo: event.target.checked }
        });
      }
    } catch (error) {
      console.error('Lỗi khi lưu cài đặt:', error);
    }
  });
}



