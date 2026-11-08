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
  /*
   * Thang khoảng cách riêng của dự án, phải khớp với tailwind.config.js.
   *
   * Có một bài test khác canh cho tailwind.config.js khỏi lệch với
   * src/theme.ts, nhưng bảng này là bản thứ ba — nên cũng kiểm luôn ở dưới.
   */
  const SPACING: Record<string, number> = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

  /** Đổi phần sau dấu gạch của một lớp đệm thành số điểm ảnh. */
  const doDem = (v: string): number => {
    // py-[7px] -> 7
    if (v.startsWith('[')) return Number(v.replace(/[[\]px]/g, '')) || 0;
    // p-md -> 12
    if (SPACING[v] !== undefined) return SPACING[v];
    // py-3 -> 12, theo thang 4px của Tailwind
    return Number(v) * 4;
  };

  const tuClassName = (the: string): { cao: number; co: boolean } => {
    /*
     * Hai cách viết className, phải đọc được cả hai:
     *
     *   className="..."        cố định
     *   className={`...`}      ghép chuỗi, để bật tắt lớp theo trạng thái
     *
     * Dạng thứ hai là cách viết bình thường của NativeWind khi nút có trạng
     * thái mờ đi lúc đang gửi. Chỉ đọc dạng đầu thì mọi nút như vậy đều bị
     * báo "không khai chiều cao ở đâu cả" — báo oan, và báo oan nhiều lần
     * thì người ta bắt đầu bỏ qua cả những lần báo đúng.
     */
    const m = /className=(?:"([^"]*)"|\{`([\s\S]*?)`\})/.exec(the);
    if (!m) return { cao: 0, co: false };
    const lop = m[1] ?? m[2];

    // min-h-[44px] hoặc h-[44px] — khai thẳng số điểm ảnh
    const thang = /(?:min-)?h-\[(\d+)px\]/.exec(lop);
    if (thang) return { cao: Number(thang[1]), co: true };

    // min-h-11 hoặc h-11 — theo thang 4px của Tailwind
    const nac = /(?:min-)?h-(\d+)(?![\w[-])/.exec(lop);
    if (nac) return { cao: Number(nac[1]) * 4, co: true };

    /*
     * Đệm trên dưới, cộng thêm phần chữ như nhánh style cũ.
     *
     * Phải đọc được BA cách viết, vì cả ba đều có thật trong dự án:
     *
     *   py-3        thang 4px của Tailwind      -> 12
     *   p-md        từ vựng riêng của dự án     -> 12
     *   py-[7px]    giá trị tự do               -> 7
     *
     * Chỉ đọc cách đầu thì mọi nút viết bằng hai cách sau đều bị báo "không
     * lớp nào khai chiều cao" — báo oan, mà p-md lại là cách viết thường gặp
     * nhất vì nó khớp với tên token bên src/theme.ts.
     *
     * Đọc cả p- gộp để khớp với nhánh style: ở đó luật đã đọc `padding` khi
     * không có `paddingVertical`.
     */
    const dem = /p[yb]?-(\[[^\]]+\]|[a-z]+|\d+(?:\.\d+)?)/.exec(lop);
    if (dem) return { cao: doDem(dem[1]) * 2 + 18, co: true };

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

        /*
         * Thân thẻ mở, tức là từ "<TouchableOpacity" tới dấu ">" đóng nó.
         *
         * Trước đây cửa sổ này dừng ở dòng chỉ có ">" hoặc kết thúc bằng
         * "/>". Nhưng một thẻ viết gọn trên MỘT dòng — <TouchableOpacity
         * onPress={…} hitSlop={10}> — thì không khớp cả hai, nên cửa sổ chạy
         * tiếp và nuốt luôn className của <Text> nằm bên trong. Nút không
         * khai chiều cao bỗng được tính là "có className", rồi bị báo sai lý
         * do, mà vi phạm thật thì nấp sau một thông báo nghe như lỗi của
         * chính bộ test.
         *
         * Đếm ngoặc để tìm đúng dấu ">" đóng thẻ: dấu ">" nằm trong {…} là
         * của mũi tên () => hay của phép so sánh, không phải chỗ thẻ hết.
         */
        let the = '';
        for (let j = i; j < Math.min(i + 30, dong.length); j++) {
          the += `${dong[j]}\n`;
          let sau = 0;
          let xong = false;
          for (const c of the) {
            if (c === '{') sau++;
            else if (c === '}') sau--;
            else if (c === '>' && sau === 0) xong = true;
          }
          if (xong) break;
        }

        if (MIEN_TRU.some((cho) => the.includes(cho))) return;

        const lop = tuClassName(the);

        /*
         * Phần vùng chạm nới thêm bằng hitSlop.
         *
         * Tính ở đây chứ không tính sau, vì nút dùng className cũng được
         * quyền nới bằng hitSlop y như nút dùng style. Trước đây phép tính
         * này nằm dưới nhánh className nên nút nào chuyển sang className là
         * mất sạch phần nới — báo oan một nút vốn đạt chuẩn.
         */
        let them = 0;
        const slop = /hitSlop=\{(\{[^}]*\}|\d+)\}/.exec(the);
        if (slop) {
          const v = slop[1];
          them = /^\d+$/.test(v) ? Number(v) * 2 : soTrong(v, 'top') + soTrong(v, 'bottom');
        }

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
          } else if (lop.cao + them < TOI_THIEU) {
            thieu.push(
              `dòng ${i + 1} (className): ${lop.cao}${them ? ` + ${them} hitSlop` : ''} = ${
                lop.cao + them
              }pt`,
            );
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

/*
 * Tailwind và theme.ts phải nói cùng một thứ tiếng.
 *
 * Màu thì đã an toàn: tailwind.config.js đọc ngược từ global.css, mà
 * global.css do máy sinh ra từ theme.ts. Không ai chép tay gì cả.
 *
 * Nhưng chín con số khoảng cách và bo góc thì viết tay trong
 * tailwind.config.js. Lệch một con số thì p-md bên className ra 12px mà
 * spacing.md bên style ra 16px — hai nửa cùng một màn hình so le nhau vài
 * điểm ảnh, đủ xấu để thấy nhưng không đủ rõ để biết vì sao.
 */
describe('Tailwind khớp với theme.ts', () => {
  // require thẳng file .ts: Node 22.18 trở lên tự bóc phần khai kiểu.
  const theme = require('../theme');
  const tw = require('../../tailwind.config.js');

  it('thang khoảng cách giống hệt nhau', () => {
    expect(tw.theme.extend.spacing).toEqual(theme.spacing);
  });

  // radius.full là 999 bên theme.ts, 9999 bên Tailwind. Cả hai đều lớn hơn
  // mọi chiều cao thật nên cùng cho ra hình viên thuốc — so riêng bốn tên,
  // bỏ qua chênh lệch vô nghĩa đó.
  it('bo góc giống nhau, trừ full vốn chỉ cần đủ lớn', () => {
    const tailwind = tw.theme.extend.borderRadius;
    expect(tailwind.sm).toBe(theme.radius.sm);
    expect(tailwind.md).toBe(theme.radius.md);
    expect(tailwind.lg).toBe(theme.radius.lg);
    expect(tailwind.full).toBeGreaterThanOrEqual(999);
  });

  /*
   * global.css phải chứa đúng từng ấy màu như theme.ts.
   *
   * Quên chạy `npm run make:css` sau khi thêm màu thì lớp bg-... của màu
   * mới im lặng không ra màu gì — Tailwind không báo lỗi với một tên màu
   * nó chưa từng nghe, nó chỉ bỏ qua.
   */
  it('global.css đã chạy lại sau lần đổi màu gần nhất', () => {
    const css = docFile(join(GOC, '..', 'global.css'));
    const tenTrongCss = [...css.matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1]);
    // Hai khối :root và .dark:root nên mỗi tên xuất hiện đúng hai lần.
    const soMau = new Set(tenTrongCss).size;

    // scrim lưu dạng rgba() nên không tách thành ba kênh được, script bỏ qua.
    const soMauTrongTheme = Object.keys(theme.lightColors).filter(
      (k) => typeof theme.lightColors[k] === 'string' && theme.lightColors[k].startsWith('#'),
    ).length;

    expect(soMau).toBe(soMauTrongTheme);
  });
});
