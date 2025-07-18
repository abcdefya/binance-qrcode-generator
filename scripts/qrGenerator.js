function generateQRUrl(transferInfo) {
  if (!transferInfo || !transferInfo.accountNumber) {
    throw new Error('Thông tin chuyển khoản không hợp lệ');
  }
  const bankId = transferInfo.bankBin || transferInfo.bankCode;
  if (!bankId) {
    throw new Error('Không tìm thấy mã ngân hàng');
  }
  let url = `https://img.vietqr.io/image/${bankId}-${transferInfo.accountNumber}-print.png`;
  const params = new URLSearchParams();
  if (transferInfo.amount) {
    params.append('amount', transferInfo.amount);
  }
  if (transferInfo.referenceMessage) {
    params.append('addInfo', transferInfo.referenceMessage);
  }
  if (transferInfo.accountName) {
    params.append('accountName', transferInfo.accountName.toUpperCase());
  }
  const queryString = params.toString();
  if (queryString) {
    url += '?' + queryString;
  }
  return url;
}

export { generateQRUrl }; 