// Service worker - chạy trong nền
console.log('Binance QR Generator: Background service worker đã khởi động');

// Lắng nghe khi extension được cài đặt hoặc cập nhật
chrome.runtime.onInstalled.addListener(() => {
  console.log('Binance QR Generator: Extension đã được cài đặt hoặc cập nhật');
});

// Lắng nghe tin nhắn từ content script nếu cần
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LOG') {
    console.log('Content script log:', message.data);
  }
  
  // Luôn trả về true nếu bạn muốn gửi phản hồi không đồng bộ
  return true;
});
