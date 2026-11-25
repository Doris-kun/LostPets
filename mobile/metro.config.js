/*
 * Metro là bộ đóng gói của React Native. NativeWind cần chen vào đây để dịch
 * global.css thành bảng style trước khi app chạy.
 *
 * Dự án trước đó không có file này. Bắt buộc phải khởi đi từ cấu hình mặc
 * định của Expo (getDefaultConfig) rồi mới bọc thêm — tự dựng từ đầu là mất
 * phần Expo khai sẵn cho asset, SVG và kiến trúc mới.
 */
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
