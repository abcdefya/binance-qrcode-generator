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
  qrImage.style.width = '600px';
  qrImage.style.height = '700px';
  qrImage.style.display = 'block';
  qrImage.style.userSelect = 'none';
  qrImage.draggable = false;
  qrImage.onerror = () => {
    console.error('QR Generator: Lỗi khi tải ảnh QR từ:', qrUrl);
    qrContainer.remove();
    qrContainer = null;
  };

  const closeButton = document.createElement('button');
  closeButton.textContent = 'X';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '5px';
  closeButton.style.right = '5px';
  closeButton.style.background = '#ff4d4f';
  closeButton.style.color = 'white';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '3px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.padding = '2px 6px';
  closeButton.onclick = () => {
    qrContainer.remove();
    qrContainer = null;
  };

  const resizeHandle = document.createElement('div');
  resizeHandle.style.position = 'absolute';
  resizeHandle.style.bottom = '0';
  resizeHandle.style.right = '0';
  resizeHandle.style.width = '10px';
  resizeHandle.style.height = '10px';
  resizeHandle.style.background = '#ccc';
  resizeHandle.style.cursor = 'se-resize';

  qrContainer.addEventListener('mousedown', (e) => {
    if (e.target === closeButton || e.target === resizeHandle) return;
    isDragging = true;
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
    dragStart.left = qrContainer.offsetLeft;
    dragStart.top = qrContainer.offsetTop;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      let newLeft = dragStart.left + deltaX;
      let newTop = dragStart.top + deltaY;

      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - qrContainer.offsetWidth));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - qrContainer.offsetHeight));

      qrContainer.style.left = `${newLeft}px`;
      qrContainer.style.top = `${newTop}px`;
      qrContainer.style.right = 'auto';
      qrContainer.style.bottom = 'auto';
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    resizeStart.x = e.clientX;
    resizeStart.y = e.clientY;
    resizeStart.width = qrContainer.offsetWidth;
    resizeStart.height = qrContainer.offsetHeight;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      let newWidth = resizeStart.width + deltaX;
      let newHeight = resizeStart.height + deltaY;

      newWidth = Math.max(100, newWidth);
      newHeight = Math.max(100, newHeight);

      qrContainer.style.width = `${newWidth}px`;
      qrContainer.style.height = `${newHeight}px`;
      qrImage.style.width = `${newWidth - 20}px`;
      qrImage.style.height = `${newHeight - 20}px`;
    }
  });

  document.addEventListener('mouseup', () => {
    isResizing = false;
  });

  qrContainer.appendChild(closeButton);
  qrContainer.appendChild(qrImage);
  qrContainer.appendChild(resizeHandle);
  document.body.appendChild(qrContainer);
}

function removeQRContainer() {
  if (qrContainer) {
    qrContainer.remove();
    qrContainer = null;
  }
}

export { showQRImage, removeQRContainer }; 