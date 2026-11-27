const fs = require('fs');
const path = require('path');

/*
 * Mọi tệp tĩnh được trỏ tới phải thật sự nằm trong public/.
 *
 * Vì sao cần test này: thiếu một tệp trong public/ KHÔNG làm hỏng build và
 * KHÔNG làm đỏ test nào. Vite dựng xong bình thường, trình duyệt xin
 * /logo.png, nhận 404, rồi vẽ ra chữ alt. Chỉ lộ ra khi có người mở trang lên
 * nhìn — mà đó là thứ hiếm khi xảy ra giữa chừng một đợt chuyển đổi.
 *
 * Đã dính thật: chuyển xong 14 trang mới phát hiện logo.png chưa được chép
 * sang, và cùng với nó là .well-known/assetlinks.json — tệp khiến đường dẫn
 * trong email mở thẳng app Android. Mất tệp đó thì App Links chết lặng, không
 * một dòng lỗi nào ở bất cứ đâu.
 */

const GOC = path.join(__dirname, '..');
const PUBLIC = path.join(GOC, 'public');

function moiFileNguon(thuMuc) {
  return fs
    .readdirSync(thuMuc, { withFileTypes: true })
    .flatMap((e) => {
      const p = path.join(thuMuc, e.name);
      if (e.isDirectory()) return moiFileNguon(p);
      return /\.(jsx?|html)$/.test(e.name) ? [p] : [];
    });
}

describe('tệp tĩnh được trỏ tới phải có thật trong public/', () => {
  const nguon = [...moiFileNguon(path.join(GOC, 'src')), path.join(GOC, 'index.html')];

  it('không đường dẫn nào trỏ vào hư không', () => {
    const thieu = [];

    nguon.forEach((f) => {
      const ma = fs.readFileSync(f, 'utf8');
      // Chỉ bắt đường dẫn tuyệt đối tới tệp tĩnh: "/logo.png", "/favicon.ico".
      // Ảnh người dùng tải lên nằm trên Cloudinary nên là URL đầy đủ, không
      // khớp biểu thức này.
      const khop = ma.match(/["'`]\/[a-zA-Z0-9._-]+\.(png|ico|svg|jpg|jpeg|webp|json|txt)["'`]/g) || [];

      [...new Set(khop)].forEach((raw) => {
        const duong = raw.slice(2, -1);
        if (!fs.existsSync(path.join(PUBLIC, duong))) {
          thieu.push(`${path.relative(GOC, f)} -> /${duong}`);
        }
      });
    });

    expect(thieu).toEqual([]);
  });

  /*
   * assetlinks.json không được trỏ tới từ mã nguồn nào cả — Android tự đi tìm
   * nó ở đúng đường dẫn cố định. Nên bài trên không canh được, phải kiểm riêng.
   */
  it('assetlinks.json còn đó, và còn đúng vân tay chứng chỉ', () => {
    const p = path.join(PUBLIC, '.well-known', 'assetlinks.json');
    expect(fs.existsSync(p)).toBe(true);

    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].target.package_name).toBe('com.lostpets.app');

    // Vân tay SHA-256 của keystore EAS. Sai một ký tự là Android lặng lẽ thôi
    // không mở app từ đường dẫn trong email nữa, không báo lỗi gì.
    const vanTay = data[0].target.sha256_cert_fingerprints;
    expect(vanTay).toHaveLength(1);
    expect(vanTay[0]).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
  });
});
