const cloudinary = require('cloudinary').v2;

// Tin đăng trước khi có trường imageId chỉ lưu URL. public_id nằm ngay trong URL,
// sau đoạn /upload/ và v<số phiên bản>, nên vẫn moi ra được để dọn.
// Chỉ đúng với URL không kèm biến đổi ảnh — chỗ này chưa bao giờ sinh loại đó.
const publicIdFromUrl = (url) => {
  const match = /\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i.exec(url || '');
  return match ? match[1] : '';
};

// Dọn ảnh không còn ai trỏ tới. Đây là việc phụ, không phải việc chính: thất bại
// thì để lại một file rác trên Cloudinary, còn tin của người dùng vẫn lưu xong.
// Nên không await và không để nó làm request thất bại.
const discardImage = (pet) => {
  const publicId = (pet && pet.imageId) || publicIdFromUrl(pet && pet.image);
  if (!publicId) return;
  cloudinary.uploader
    .destroy(publicId)
    .catch((err) => console.error('Không xoá được ảnh cũ:', publicId, err && err.message));
};

// Dọn ảnh của cả một mẻ tin. Dùng cho đợt xoá tự động, nơi mỗi lần chạy có thể
// đụng tới hàng chục tin — gọi tuần tự thì một ảnh chậm làm nghẽn cả mẻ.
const discardImages = (pets = []) => {
  pets.forEach(discardImage);
};

module.exports = { publicIdFromUrl, discardImage, discardImages };
