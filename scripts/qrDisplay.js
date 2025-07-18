let qrContainer = null;
let isDragging = false;
let isResizing = false;
let dragStart = { x: 0, y: 0, left: 0, top: 0 };
let resizeStart = { x: 0, y: 0, width: 0, height: 0 };

function showQRImage(qrUrl) {
  if (qrContainer) {
    qrContainer.remove();
    qrContainer = null;
  }

  qrContainer = document.createElement('div');
  qrContainer.id = 'qr-floating-container';
  qrContainer.style.position = 'absolute';
  qrContainer.style.bottom = '500px';
  qrContainer.style.right = '300px';
  qrContainer.style.zIndex = '9999';
  qrContainer.style.background = 'white';
  qrContainer.style.padding = '10px';
  qrContainer.style.border = '1px solid #ccc';
  qrContainer.style.borderRadius = '5px';
  qrContainer.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  qrContainer.style.cursor = 'move';

  const qrImage = document.createElement('img');
  qrImage.src = qrUrl;
  qrImage.alt = 'QR Code';
  qrImage.style.maxWidth = '200px';
  qrImage.style.maxHeight = '200px';
  qrImage.style.display = 'block';
  qrImage.style.marginBottom = '10px';
  qrImage.onerror = () => {
    console.error('QR Generator: Lỗi khi tải hình ảnh QR');
    qrImage.alt = 'Lỗi tải QR';
  };

  const title = document.createElement('div');
  title.textContent = 'QR Chuyển Khoản';
  title.style.fontWeight = 'bold';
  title.style.marginBottom = '5px';
  title.style.cursor = 'move';

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Đóng';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '5px';
  closeButton.style.right = '5px';
  closeButton.style.padding = '2px 5px';
  closeButton.style.background = '#ff6347';
  closeButton.style.color = 'white';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '3px';
  closeButton.style.cursor = 'pointer';
  closeButton.onclick = removeQRContainer;

  const resizeHandle = document.createElement('div');
  resizeHandle.style.position = 'absolute';
  resizeHandle.style.bottom = '0';
  resizeHandle.style.right = '0';
  resizeHandle.style.width = '10px';
  resizeHandle.style.height = '10px';
  resizeHandle.style.background = '#ccc';
  resizeHandle.style.cursor = 'se-resize';

  qrContainer.appendChild(title);
  qrContainer.appendChild(qrImage);
  qrContainer.appendChild(closeButton);
  qrContainer.appendChild(resizeHandle);
  document.body.appendChild(qrContainer);

  qrContainer.addEventListener('mousedown', startDragging);
  resizeHandle.addEventListener('mousedown', startResizing);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mousemove', resize);
  document.addEventListener('mouseup', stopDragging);
  document.addEventListener('mouseup', stopResizing);
}

function removeQRContainer() {
  if (qrContainer) {
    qrContainer.remove();
    qrContainer = null;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopDragging);
    document.removeEventListener('mouseup', stopResizing);
  }
}

function startDragging(e) {
  if (e.target.tagName !== 'BUTTON') {
    isDragging = true;
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
    dragStart.left = qrContainer.offsetLeft;
    dragStart.top = qrContainer.offsetTop;
  }
}

function drag(e) {
  if (isDragging) {
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    qrContainer.style.left = `${dragStart.left + dx}px`;
    qrContainer.style.top = `${dragStart.top + dy}px`;
    qrContainer.style.right = 'auto';
    qrContainer.style.bottom = 'auto';
  }
}

function stopDragging() {
  isDragging = false;
}

function startResizing(e) {
  e.preventDefault();
  isResizing = true;
  resizeStart.x = e.clientX;
  resizeStart.y = e.clientY;
  resizeStart.width = qrContainer.offsetWidth;
  resizeStart.height = qrContainer.offsetHeight;
}

function resize(e) {
  if (isResizing) {
    const dx = e.clientX - resizeStart.x;
    const dy = e.clientY - resizeStart.y;
    const newWidth = Math.max(100, resizeStart.width + dx);
    const newHeight = Math.max(100, resizeStart.height + dy);
    qrContainer.style.width = `${newWidth}px`;
    qrContainer.style.height = `${newHeight}px`;
    qrContainer.querySelector('img').style.maxWidth = `${newWidth - 20}px`;
    qrContainer.querySelector('img').style.maxHeight = `${newHeight - 40}px`;
  }
}

function stopResizing() {
  isResizing = false;
}

// Gắn vào đối tượng toàn cục QRGenerator
window.QRGenerator = window.QRGenerator || {};
window.QRGenerator.showQRImage = showQRImage;
window.QRGenerator.removeQRContainer = removeQRContainer; 