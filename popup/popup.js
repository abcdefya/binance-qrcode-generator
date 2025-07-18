// popup.js
// Hàm chuẩn hóa chuỗi (copied từ bankMapper.js để sử dụng trong popup)
function normalizeString(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Hàm ánh xạ ngân hàng (copied từ bankMapper.js để sử dụng trong popup)
async function mapBankName(inputBankName) {
  try {
    const bankList = await fetch(chrome.runtime.getURL('bankList.json')).then(res => res.json());
    const normalizedInput = normalizeString(inputBankName);
    const bankArray = Object.keys(bankList).map(key => ({
      key,
      ...bankList[key]
    }));

    // Tìm kiếm chính xác trước
    for (const bank of bankArray) {
      const normalizedShortName = normalizeString(bank.short_name);
      const normalizedCode = normalizeString(bank.code);
      const normalizedKeywords = bank.keywords ? bank.keywords.map(normalizeString) : [];

      if (
        normalizedInput === normalizedShortName ||
        normalizedInput === normalizedCode ||
        normalizedKeywords.includes(normalizedInput)
      ) {
        return {
          name: bank.name,
          bin: bank.bin,
          code: bank.code
        };
      }
    }

    // Tìm kiếm mờ với Fuse.js
    const fuse = new Fuse(bankArray, {
      keys: [
        { name: 'keywords', weight: 0.5 },
        { name: 'short_name', weight: 0.3 },
        { name: 'code', weight: 0.2 },
        { name: 'name', weight: 0.1 }
      ],
      threshold: 0.2,
      includeScore: true,
      minMatchCharLength: 1
    });

    const results = fuse.search(normalizedInput);
    if (results.length > 0 && results[0].score < 0.3) {
      const bank = results[0].item;
      return {
        name: bank.name,
        bin: bank.bin,
        code: bank.code
      };
    }

    return null;
  } catch (error) {
    console.error('QR Generator: Lỗi khi ánh xạ ngân hàng:', error);
    return null;
  }
}

// Lắng nghe sự kiện khi popup được mở
document.addEventListener('DOMContentLoaded', async () => {
  // Kiểm tra xem extension có đang hoạt động trên tab hiện tại không
  checkActiveTab();
  
  // Khởi tạo các cài đặt từ local storage
  initSettings();
  
  // Lắng nghe sự kiện thay đổi cài đặt và kiểm tra ngân hàng
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
    console.error('QR Generator: Lỗi khi kiểm tra tab hiện tại:', error);
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
    console.log('QR Generator: Khởi tạo cài đặt - autoShowQR:', settings.autoShowQR, 'showTransferInfo:', settings.showTransferInfo);
  } catch (error) {
    console.error('QR Generator: Lỗi khi khởi tạo cài đặt:', error);
  }
}

// Thiết lập các sự kiện lắng nghe
function setupEventListeners() {
  // Lắng nghe sự kiện thay đổi cài đặt tự động hiển thị QR
  document.getElementById('autoShowQR').addEventListener('change', async (event) => {
    try {
      await chrome.storage.sync.set({ autoShowQR: event.target.checked });
      console.log('QR Generator: Cập nhật autoShowQR:', event.target.checked);
      
      // Gửi thông báo đến content script
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, {
          type: 'SETTINGS_CHANGED',
          settings: { autoShowQR: event.target.checked }
        });
      }
    } catch (error) {
      console.error('QR Generator: Lỗi khi lưu cài đặt autoShowQR:', error);
    }
  });
  
  // Lắng nghe sự kiện thay đổi cài đặt hiển thị thông tin chuyển khoản
  document.getElementById('showTransferInfo').addEventListener('change', async (event) => {
    try {
      await chrome.storage.sync.set({ showTransferInfo: event.target.checked });
      console.log('QR Generator: Cập nhật showTransferInfo:', event.target.checked);
      
      // Gửi thông báo đến content script
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, {
          type: 'SETTINGS_CHANGED',
          settings: { showTransferInfo: event.target.checked }
        });
      }
    } catch (error) {
      console.error('QR Generator: Lỗi khi lưu cài đặt showTransferInfo:', error);
    }
  });
  
  // Lắng nghe sự kiện kiểm tra ánh xạ ngân hàng
  document.getElementById('testBank').addEventListener('click', async () => {
    const bankName = document.getElementById('bankNameInput').value;
    const resultOutput = document.getElementById('resultOutput');
    
    if (!bankName) {
      resultOutput.textContent = 'Vui lòng nhập tên ngân hàng';
      return;
    }
    
    try {
      const mappedBank = await mapBankName(bankName);
      if (mappedBank) {
        resultOutput.textContent = JSON.stringify(mappedBank, null, 2);
      } else {
        resultOutput.textContent = `Không tìm thấy ngân hàng phù hợp cho "${bankName}"`;
      }
    } catch (error) {
      console.error('QR Generator: Lỗi khi kiểm tra ánh xạ ngân hàng:', error);
      resultOutput.textContent = `Lỗi: ${error.message}`;
    }
  });
}