// Nạp một script bên ngoài, mỗi địa chỉ chỉ nạp đúng một lần.
//
// SDK của Google và Facebook không đưa vào bundle được, phải lấy từ máy chủ của
// họ. Nạp sẵn trong index.html thì mọi người vào trang chủ đều phải tải hai
// SDK đó dù chẳng mấy ai bấm đăng nhập — nên chỉ nạp khi thật sự cần tới.
const pending = new Map();

export default function loadScript(src) {
  if (pending.has(src)) return pending.get(src);

  const promise = new Promise((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = src;
    tag.async = true;
    tag.onload = () => resolve();
    tag.onerror = () => {
      // Xoá khỏi bộ nhớ đệm để lần bấm sau còn thử lại được. Giữ lại một lời
      // hứa đã hỏng thì mất mạng một lần là hỏng vĩnh viễn tới khi tải lại trang.
      pending.delete(src);
      reject(new Error(`Không tải được ${src}`));
    };
    document.head.appendChild(tag);
  });

  pending.set(src, promise);
  return promise;
}
