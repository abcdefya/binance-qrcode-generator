const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'production', // Hoặc 'development' để debug
  entry: {
    vendor: ['fuzzball', 'unidecode'], // Đóng gói fuzzball và unidecode
  },
  output: {
    path: path.resolve(__dirname, 'lib'), // Xuất ra thư mục lib/
    filename: 'vendor.bundle.js', // File đầu ra
    library: 'Vendor', // Xuất dưới dạng biến toàn cục
    libraryTarget: 'umd', // Hỗ trợ cả browser và Node.js
  },
  resolve: {
    fallback: {
      buffer: require.resolve('buffer/'), // Polyfill cho Buffer
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'], // Cung cấp Buffer toàn cục
    }),
  ],
  optimization: {
    minimize: true, // Nén file đầu ra
  },
};