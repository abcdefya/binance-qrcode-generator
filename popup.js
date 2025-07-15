document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('toggle');
  
    // Tải trạng thái đã lưu
    chrome.storage.local.get('isEnabled', ({ isEnabled }) => {
      toggle.checked = isEnabled !== false;
    });
  
    // Xử lý thay đổi trạng thái
    toggle.addEventListener('change', () => {
      const isEnabled = toggle.checked;
      chrome.storage.local.set({ isEnabled });
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle', isEnabled });
      });
    });
  });