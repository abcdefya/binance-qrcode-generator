// transferInfoExtractor.js
async function extractBankTransferInfo(document) {
  const transferInfo = {
    paymentMethod: null,
    accountName: null,
    accountNumber: null,
    bankName: null,
    bankBin: null,
    bankCode: null,
    bankBranch: null,
    referenceMessage: null,
    amount: null,
    orderType: null,
    orderNumber: null
  };
  try {
    console.log('QR Generator: Bắt đầu trích xuất thông tin chuyển khoản');

    const orderNumberElement = document.querySelector('div[data-bn-type="text"].css-14yjdiq');
    if (orderNumberElement) {
      transferInfo.orderNumber = orderNumberElement.textContent.trim();
      transferInfo.referenceMessage = transferInfo.orderNumber;
      console.log('QR Generator: orderNumber:', transferInfo.orderNumber);
    } else {
      console.warn('QR Generator: Không tìm thấy orderNumberElement');
    }

    const paymentMethodElement = document.querySelector('.PaymentMethodItem__text');
    if (paymentMethodElement) {
      transferInfo.paymentMethod = paymentMethodElement.textContent.trim();
      console.log('QR Generator: paymentMethod:', transferInfo.paymentMethod);
    } else {
      console.warn('QR Generator: Không tìm thấy paymentMethodElement');
    }

    const amountElement = document.querySelector('.sc-jJMGnK');
    if (amountElement) {
      const amountText = amountElement.textContent.trim();
      const amountMatch = amountText.match(/[\d,]+\.\d+|\d+/);
      if (amountMatch) {
        transferInfo.amount = amountMatch[0].replace(/,/g, '');
        console.log('QR Generator: amount:', transferInfo.amount);
      } else {
        console.warn('QR Generator: Không trích xuất được số tiền từ:', amountText);
      }
    } else {
      console.warn('QR Generator: Không tìm thấy amountElement');
    }

    const orderTypeElement = document.querySelector('.css-vurnku');
    if (orderTypeElement) {
      const orderTypeText = orderTypeElement.textContent;
      transferInfo.orderType = orderTypeText.includes('Mua') ? 'buy' : (orderTypeText.includes('Bán') ? 'sell' : null);
      console.log('QR Generator: orderType:', transferInfo.orderType);
    } else {
      console.warn('QR Generator: Không tìm thấy orderTypeElement');
    }

    const isVietnamBankTransfer = transferInfo.paymentMethod && transferInfo.paymentMethod.includes('(Việt Nam)');
    const labelMap = isVietnamBankTransfer ? {
      'Họ và tên': 'accountName',
      'Tên ngân hàng': 'bankName',
      'S intravietnam': 'accountNumber',
      'Chi nhánh mở tài khoản': 'bankBranch',
      'Nội dung chuyển khoản': 'referenceMessage'
    } : {
      'Name': 'accountName',
      'Bank Card/Account Number': 'accountNumber',
      'Tên ngân hàng': 'bankName',
      'Chi nhánh mở tài khoản': 'bankBranch',
      'Nội dung chuyển khoản': 'referenceMessage'
    };

    const infoRows = document.querySelectorAll('.flex.justify-between');
    infoRows.forEach(row => {
      const labelElement = row.querySelector('.text-tertiaryText div');
      const valueElement = row.querySelector('.flex.flex-grow.justify-end .break-words div');
      const labelText = labelElement?.textContent?.trim();
      const valueText = valueElement?.textContent?.trim();
      if (labelText && valueText && labelMap[labelText]) {
        const field = labelMap[labelText];
        if (field === 'accountNumber') {
          transferInfo[field] = valueText.replace(/[^0-9]/g, '');
        } else {
          transferInfo[field] = valueText;
        }
        console.log('QR Generator: Trích xuất', field, ':', transferInfo[field]);
      }
    });

    if (transferInfo.bankName) {
      const bankList = await window.QRGenerator.getBankList();
      const bankInfo = window.QRGenerator.mapBankName(transferInfo.bankName, bankList);
      if (bankInfo) {
        transferInfo.bankName = bankInfo.name;
        transferInfo.bankBin = bankInfo.bin;
        transferInfo.bankCode = bankInfo.code;
        console.log('QR Generator: mappedBank:', bankInfo);
      } else {
        console.warn('QR Generator: Không ánh xạ được ngân hàng:', transferInfo.bankName);
      }
    } else {
      console.warn('QR Generator: bankName không có giá trị');
    }

    console.log('QR Generator: Kết quả transferInfo:', transferInfo);
    return transferInfo;
  } catch (error) {
    console.error('QR Generator: Lỗi khi trích xuất thông tin:', error);
    return null;
  }
}

// Gắn vào đối tượng toàn cục QRGenerator
window.QRGenerator = window.QRGenerator || {};
window.QRGenerator.extractBankTransferInfo = extractBankTransferInfo;