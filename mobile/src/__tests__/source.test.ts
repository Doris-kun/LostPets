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

        const m = /styles\.(\w+)/.exec(the);
        if (!m) return;
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
        const pv = soTrong(body, 'paddingVertical');

        const iText = ma.indexOf(`${ten}Text:`);
        const cuChu = iText >= 0 ? soTrong(than(ma, iText), 'fontSize') || 14 : 14;

        const cao = minH || h || (pv ? pv * 2 + Math.round(cuChu * 1.3) : 0);
        if (!cao) return; // không đo được thì bỏ qua, thà sót còn hơn báo bừa

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
