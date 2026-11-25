import { useEffect, useState } from 'react';
import NoPhoto from './NoPhoto.jsx';
import { sized } from '../images';

/*
 * Ảnh của tin, kèm đường lui khi tải hỏng.
 *
 * Có URL không có nghĩa là có ảnh. Ảnh nằm ở máy chủ của người khác, mà máy
 * chủ thì sập, đổi đường dẫn, hoặc chặn gọi từ web khác. Lúc đó thẻ <img>
 * không vẽ được gì và để lại một ô trống trơn — người xem tưởng web hỏng.
 *
 * Trường hợp này KHÁC với tin không có ảnh, nhưng người xem thì không phân
 * biệt được, nên cả hai cùng rơi về một chỗ hiển thị.
 *
 * width: chiều rộng ảnh cần tải về, tính bằng pixel thật của màn hình — tức
 * gấp đôi kích thước CSS nếu muốn nét trên màn hình Retina. Mỗi chỗ gọi tự
 * khai theo khung của mình: thẻ 96px và ảnh lớn trang chi tiết mà dùng chung
 * một con số thì hoặc là mờ, hoặc là tải thừa.
 */
export default function PetPhoto({
  src = '',
  alt = '',
  imgClass = 'w-full h-full object-cover',
  type = 'lost',
  resolved = false,
  label = true,
  width = 800,
}) {
  const [failed, setFailed] = useState(false);

  /*
   * Danh sách dùng lại component khi cuộn trang hoặc đổi bộ lọc. Không xoá cờ
   * này thì một ảnh hỏng làm mọi tin sau đó cũng mất ảnh theo.
   *
   * Bản Vue dùng watch: src(). Ở React là useEffect theo src — cùng một việc.
   */
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return <NoPhoto type={type} resolved={resolved} label={label} />;
  }

  return (
    <img
      // Chỉ dùng để hiển thị. Giá trị này không bao giờ được gửi ngược lên
      // server — xem chú thích trong src/images.js.
      src={sized(src, width)}
      alt={alt}
      className={imgClass}
      onError={() => setFailed(true)}
    />
  );
}
