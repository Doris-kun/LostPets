import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/*
 * Bộ test ĐỌC MÃ NGUỒN thay vì chạy mã.
 *
 * Hơi lạ, nhưng đúng việc: mấy quy tắc dưới đây không chạy ra kết quả để so
 * sánh được — chúng là quy tắc về CÁCH VIẾT. Và cả ba đều đã bị vi phạm thật
 * một lần, nên để test canh thay vì trông vào trí nhớ.
 */

const GOC = join(__dirname, '..');

function docFile(duongDan: string): string {
  return readFileSync(duongDan, 'utf8').split('\r\n').join('\n');
}

function liet(thuMuc: string, duoi: string[]): string[] {
  return readdirSync(join(GOC, thuMuc))
    .filter((f) => duoi.some((d) => f.endsWith(d)))
    .map((f) => join(GOC, thuMuc, f));
}

const FILE_GIAO_DIEN = [...liet('screens', ['.tsx']), ...liet('components', ['.tsx'])];

// Bỏ phần chú thích đi trước khi soi, không thì chính lời giải thích về một
// quy tắc lại bị tính là vi phạm quy tắc đó.
function boChuThich(ma: string): string {
  return ma.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('vùng chạm tối thiểu 44pt', () => {
  /*
   * Luật Critical của hướng dẫn giao diện di động: 44pt trên iOS, 48dp trên
   * Android. Đo lần đầu thì 8 trên 34 nút không đạt — nút Gửi trong chat 41pt,
   * tab Đăng nhập 38pt, nút đóng bảng lọc 32x32.
   *
   * Hai cách đạt: phóng nút cho đủ 44 bằng minHeight, hoặc giữ nguyên hình và
   * nới vùng chạm bằng hitSlop. Test chấp nhận cả hai.
   */
  const TOI_THIEU = 44;

  /*
   * Đọc chiều cao từ className của Tailwind.
   *
   * Dự án đang chuyển dần sang NativeWind, nên một nút có thể khai chiều cao
   * bằng style cũ, bằng className, hoặc cả hai. Không đọc được className thì
   * mỗi màn chuyển xong là luật này mất thêm vài nút — mà mất trong IM LẶNG,
   * vì trước đây không đo được là nó cho qua.
   *
   * Thang của Tailwind: 1 đơn vị = 4px, nên h-11 là 44px.
   */
  const tuClassName = (the: string): { cao: number; co: boolean } => {
    const m = /className="([^"]*)"/.exec(the);
    if (!m) return { cao: 0, co: false };
    const lop = m[1];

    // min-h-[44px] hoặc h-[44px] — khai thẳng số điểm ảnh
    const thang = /(?:min-)?h-\[(\d+)px\]/.exec(lop);
    if (thang) return { cao: Number(thang[1]), co: true };

    // min-h-11 hoặc h-11 — theo thang 4px của Tailwind
    const nac = /(?:min-)?h-(\d+)(?![\w[-])/.exec(lop);
    if (nac) return { cao: Number(nac[1]) * 4, co: true };

    // py-3 — đệm trên dưới, cộng thêm phần chữ như nhánh style cũ
    const dem = /py-(\d+)/.exec(lop);
    if (dem) return { cao: Number(dem[1]) * 4 * 2 + 18, co: true };

    return { cao: 0, co: true };
  };

  /*
   * Những nút cố ý không đo được, kèm lý do.
   *
   * Danh sách này phải NGẮN và mỗi dòng phải có lý do thật — thêm một dòng
   * vào đây là bỏ một nút ra khỏi vòng canh chừng.
   */
  const MIEN_TRU = [
    // Phủ kín khung bản đồ để bắt cú chạm mở trình chọn, nên rộng bằng cả khung.
    'StyleSheet.absoluteFill',
  ];

  const soTrong = (chuoi: string, khoa: string): number => {
    const i = chuoi.indexOf(`${khoa}:`);
    if (i < 0) return 0;
    const m = /-?\d+(\.\d+)?/.exec(chuoi.slice(i + khoa.length + 1, i + khoa.length + 24));
    return m ? Number(m[0]) : 0;
  };

  // Lấy phần thân của khối { ... }, đếm ngoặc để không dừng sai chỗ
  const than = (ma: string, tu: number): string => {
    const mo = ma.indexOf('{', tu);
    if (mo < 0) return '';
    let sau = 0;
    for (let i = mo; i < ma.length; i++) {
      if (ma[i] === '{') sau++;
      else if (ma[i] === '}' && --sau === 0) return ma.slice(mo + 1, i);
    }
    return '';
  };

  it.each(FILE_GIAO_DIEN.map((f) => [f.split(/[\\/]/).pop() as string, f]))(
    '%s',
    (_ten, duongDan) => {
      const ma = docFile(duongDan);
      const dong = ma.split('\n');
      const thieu: string[] = [];

      dong.forEach((l, i) => {
        if (!l.includes('<TouchableOpacity') && !l.includes('<Pressable')) return;

        // Thân thẻ mở: tới dòng chỉ có ">" hoặc kết thúc bằng "/>"
        let the = '';
        for (let j = i; j < Math.min(i + 30, dong.length); j++) {
          the += `${dong[j]}\n`;
          const t = dong[j].trim();
          if (t === '>' || t.endsWith('/>')) break;
        }

        if (MIEN_TRU.some((cho) => the.includes(cho))) return;

        const lop = tuClassName(the);

        const m = /styles\.(\w+)/.exec(the);
        if (!m) {
          /*
           * Không có styles.X. Hoặc nút đã chuyển sang className, hoặc nó
           * không khai chiều cao ở đâu cả.
           *
           * Trước đây nhánh này lặng lẽ return, và đó là chỗ nguy hiểm nhất
           * của cả bộ test: chuyển một màn sang NativeWind là mất sạch phần
           * canh chừng của màn đó mà vẫn báo xanh. Siết lại xong thì lòi ra
           * ngay một vi phạm thật đang nấp ở đây — nút "Xong" trên bản đồ,
           * chữ 15pt cộng hitSlop 10 mới được 40.
           */
          if (!lop.co) {
            thieu.push(`dòng ${i + 1}: không khai chiều cao ở đâu cả`);
          } else if (lop.cao === 0) {
            thieu.push(`dòng ${i + 1}: có className nhưng không lớp nào khai chiều cao`);
          } else if (lop.cao < TOI_THIEU) {
            thieu.push(`dòng ${i + 1} (className): ${lop.cao}pt`);
          }
          return;
        }
        const ten = m[1];

        const viTri = ma.indexOf(`\n  ${ten}: {`) >= 0
          ? ma.indexOf(`\n  ${ten}: {`)
          : ma.indexOf(`\n    ${ten}: {`);
        if (viTri < 0) return;
        const body = than(ma, viTri);

        const minH = soTrong(body, 'minHeight');
        const h = body.includes('height:') && !body.includes('minHeight:')
          ? soTrong(body, 'height')
          : 0;
        /*
         * paddingVertical, hoac padding gop neu khong co paddingVertical.
         *
         * Nhieu nut khai `padding: spacing.md` chu khong tach rieng chieu doc.
         * Khong doc dang do thi 12 nut tro thanh "khong do duoc" — ma phan lon
         * trong so do thuc ra dat chuan, chi la luat khong biet doc.
         */
        const pv = soTrong(body, 'paddingVertical') || soTrong(body, 'padding');

        const iText = ma.indexOf(`${ten}Text:`);
        const cuChu = iText >= 0 ? soTrong(than(ma, iText), 'fontSize') || 14 : 14;

        const cao = minH || h || (pv ? pv * 2 + Math.round(cuChu * 1.3) : 0) || lop.cao;

        /*
         * Khong do duoc tu style thi bo qua, KHONG bao do.
         *
         * Khoang muoi nut lay chieu cao tu noi dung ben trong — the tin, dai
         * tro ly, dong trong bang chon. Doc ma nguon tinh thi khong the biet
         * cao bao nhieu, ma doi hoi dieu do la dat ra mot luat khong ai dap
         * ung duoc.
         *
         * Cho that su nguy hiem da duoc chan o nhanh tren: nut CO className
         * ma khong co lop nao khai chieu cao thi bao do. Do moi la cho mat
         * canh chung khi chuyen sang NativeWind.
         */
        if (!cao) return;

        let them = 0;
        const slop = /hitSlop=\{(\{[^}]*\}|\d+)\}/.exec(the);
        if (slop) {
          const v = slop[1];
          them = /^\d+$/.test(v)
            ? Number(v) * 2
            : soTrong(v, 'top') + soTrong(v, 'bottom');
        }

        if (cao + them < TOI_THIEU) {
          thieu.push(`dòng ${i + 1} (${ten}): ${cao}${them ? ` + ${them} hitSlop` : ''} = ${cao + them}pt`);
        }
      });

      expect(thieu).toEqual([]);
    },
  );
});

describe('không dùng ký tự làm icon', () => {
  /*
   * Dấu → vỡ trên Android: phông hệ thống của máy đó không có ký tự ấy nên vẽ
   * ra "′n". Quét cả app lúc đó còn 13 chỗ y hệt: 📍 ⚙ ✓ ⚠ 🔒 ✨ ↗ 🐾 ✕.
   * Đều là bom hẹn giờ cùng một kiểu, chỉ là chưa ai mở đúng màn hình đó trên
   * đúng máy đó.
   *
   * Phông icon của Ionicons đóng gói BÊN TRONG app nên máy nào cũng giống nhau.
   */
  const choPhep = new Set(['—', '·', '’', '‘', '“', '”', '…', '–']);

  it.each(FILE_GIAO_DIEN.map((f) => [f.split(/[\\/]/).pop() as string, f]))(
    '%s',
    (_ten, duongDan) => {
      const ma = boChuThich(docFile(duongDan));
      const xau = [...new Set([...ma])].filter(
        (c) =>
          (c.codePointAt(0) ?? 0) > 0x2000 &&
          !/[À-ɏḀ-ỿ]/.test(c) &&
          !choPhep.has(c),
      );

      expect(xau).toEqual([]);
    },
  );
});

describe('không dùng StyleSheet.absoluteFillObject', () => {
  /*
   * React Native 0.88 đã BỎ HẲN absoluteFillObject — nó chỉ còn trong một
   * dòng chú thích của thư viện. Mà trải một thứ undefined vào object thì
   * JavaScript cho qua im lặng: style ra thiếu mất phần định vị.
   *
   * Đã dính thật ở hai chỗ: lớp phủ "Đang tải bản đồ" thôi không phủ nữa, và
   * nền mờ sau bảng chọn ảnh rộng 0 điểm nên "chạm ra ngoài để đóng" chết lặng.
   */
  it.each(FILE_GIAO_DIEN.map((f) => [f.split(/[\\/]/).pop() as string, f]))(
    '%s',
    (_ten, duongDan) => {
      expect(boChuThich(docFile(duongDan))).not.toContain('absoluteFillObject');
    },
  );
});
