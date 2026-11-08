/**
 * Xuất bảng test case Pass/Fail để dán vào phụ lục báo cáo (Objective 4).
 *
 *   npm run test:report
 *
 * Vì sao cần, khi đã có `npm test`: tiêu chí của Objective 4 là
 * "≥90% of documented functional test cases pass (Pass/Fail recorded)".
 * Chữ quan trọng là DOCUMENTED. Một màn hình chữ xanh không phải tài liệu —
 * nó biến mất khi đóng terminal, không dán vào phụ lục được, và không ai đọc
 * được từng test case kiểm cái gì.
 *
 * Script này KHÔNG tự chấm điểm. Nó chạy đúng bộ test thật rồi chép lại kết
 * quả, kể cả khi có test trượt. Một bảng luôn luôn 100% là một bảng đáng ngờ.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const OUT = path.join(__dirname, '..', 'eval', 'test-cases.md');
const PASS_TARGET = 90; // Objective 4

// Mỗi file test phụ trách một mảng chức năng, và mảng đó phục vụ mục tiêu nào
// trong proposal. Ghi rõ để người chấm lần ngược được từ bảng về Objective,
// thay vì phải tự đoán 'coords.test.js' là cái gì.
const GROUPS = {
  'auth.test.js':           ['Đăng ký và đăng nhập bằng mật khẩu', 'Obj 2'],
  'oauth.test.js':          ['Đăng nhập Google/Facebook và quy tắc gắn tài khoản', 'Obj 2'],
  'oauth-audience.test.js': ['Kiểm aud của ID token Google (web, iOS, Android)', 'Obj 2'],
  'admin.test.js':          ['Trang quản trị và phân quyền', 'Obj 2'],
  'my-posts.test.js':       ['Danh sách tin của chính mình', 'Obj 2'],
  'secret-detail.test.js':  ['Đặc điểm nhận dạng giữ kín', 'Obj 2'],
  'rate-limit.test.js':     ['Chặn tần suất gọi API', 'Obj 2'],
  'cors.test.js':           ['Giới hạn nguồn gọi API (CORS)', 'Obj 2'],
  'error-handler.test.js':  ['Xử lý lỗi toàn cục', 'Obj 2'],
  'pets.test.js':           ['Tạo, đọc, sửa, xoá tin đăng', 'Obj 2'],
  'coords.test.js':         ['Toạ độ và làm nhiễu vị trí', 'Obj 2'],
  'petmap.test.js':         ['Bản đồ và gom nhóm ghim', 'Obj 2'],
  'pet-photo.test.js':      ['Ảnh tin đăng và đường lui khi ảnh hỏng', 'Obj 2'],
  'report.test.js':         ['Báo cáo tin xấu', 'B12'],
  'cleanup.test.js':        ['Tự động xoá tin đã giải quyết', 'B10'],
  'ai.test.js':             ['Phân tích ảnh bằng AI', 'Obj 4'],
  'ai-match.test.js':       ['So khớp Lost↔Found đầu-cuối', 'Obj 3'],
  'matching.test.js':       ['Tầng truy hồi ứng viên so khớp', 'Obj 3'],
  'search.test.js':         ['Tìm kiếm theo nghĩa', 'Obj 4'],
  'rerank.test.js':         ['Tái xếp hạng kết quả tìm kiếm', 'Obj 4 / B07'],
  'chat.test.js':           ['Trợ lý hỗ trợ kỹ thuật', 'Could-Have'],
};

const groupOf = (file) => GROUPS[path.basename(file)] || [path.basename(file), '—'];

// Dấu | trong tên test sẽ phá cấu trúc bảng Markdown.
const escapeCell = (text) => String(text).replace(/\|/g, '\\|').trim();

function runJest() {
  const json = path.join(os.tmpdir(), `lostpets-jest-${Date.now()}.json`);
  console.log('Đang chạy toàn bộ bộ test...\n');
  // Gọi thẳng jest bằng node, không qua npx và không bật shell. Bật shell thì
  // tham số bị nối chuỗi thay vì được thoát, Node cảnh báo đúng chỗ đó — mà ở
  // đây cũng chẳng cần shell làm gì.
  //
  // Không dùng exit code để quyết định gì cả: jest trả khác 0 khi có test
  // trượt, mà test trượt chính là thứ cần ghi vào bảng.
  // Đường dẫn thẳng chứ không require.resolve: jest khoá các đường dẫn nội bộ
  // trong trường "exports" của package.json nên require.resolve ném
  // ERR_PACKAGE_PATH_NOT_EXPORTED.
  const jestBin = path.join(__dirname, '..', 'node_modules', 'jest', 'bin', 'jest.js');
  if (!fs.existsSync(jestBin)) {
    console.error('Không tìm thấy jest trong node_modules. Chạy `npm install` trước.');
    process.exit(1);
  }
  spawnSync(process.execPath, [jestBin, '--json', '--forceExit', `--outputFile=${json}`], {
    cwd: path.join(__dirname, '..'),
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  if (!fs.existsSync(json)) {
    console.error('Jest không tạo được file kết quả. Thử chạy `npm test` xem hỏng ở đâu.');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(json, 'utf8'));
  fs.unlinkSync(json);
  return data;
}

function collect(data) {
  const rows = [];
  for (const suite of data.testResults) {
    const [group, objective] = groupOf(suite.name);
    for (const t of suite.assertionResults) {
      rows.push({
        group,
        objective,
        // ancestorTitles là các describe lồng nhau. Ghép lại thành một câu để
        // đọc được mà không cần mở file test.
        name: [...t.ancestorTitles, t.title].join(' › '),
        status: t.status,
      });
    }
  }
  // Gom theo nhóm, giữ thứ tự như bảng GROUPS để bảng không nhảy lung tung
  // giữa các lần chạy.
  const order = Object.values(GROUPS).map(([g]) => g);
  rows.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
  return rows;
}

const label = (status) =>
  status === 'passed' ? 'Pass' : status === 'failed' ? '**FAIL**' : 'Bỏ qua';

function build(rows, data) {
  const total = rows.length;
  const passed = rows.filter((r) => r.status === 'passed').length;
  const failed = rows.filter((r) => r.status === 'failed').length;
  const skipped = total - passed - failed;
  const rate = total === 0 ? 0 : Math.round((passed / total) * 1000) / 10;

  const L = [];
  L.push('# Bảng test case chức năng — back-end LostPets');
  L.push('');
  L.push(`Chạy ngày ${new Date().toISOString().slice(0, 10)} · sinh tự động bởi \`npm run test:report\``);
  L.push('');
  L.push('## Tổng hợp');
  L.push('');
  L.push('| | |');
  L.push('|---|---|');
  L.push(`| Tổng số test case | ${total} |`);
  L.push(`| Pass | ${passed} |`);
  L.push(`| Fail | ${failed} |`);
  if (skipped) L.push(`| Bỏ qua | ${skipped} |`);
  L.push(`| Tỉ lệ pass | **${rate}%** |`);
  L.push(`| Tiêu chí Objective 4 | ≥ ${PASS_TARGET}% |`);
  L.push(`| Kết luận | ${rate >= PASS_TARGET ? '**Đạt**' : '**Chưa đạt**'} |`);
  L.push('');
  L.push(`Môi trường: Jest ${data.testResults.length} bộ test, cơ sở dữ liệu tạm trong bộ nhớ (mongodb-memory-server), không gọi mạng ra ngoài.`);
  L.push('');

  L.push('## Theo nhóm chức năng');
  L.push('');
  L.push('| Nhóm | Mục tiêu | Số case | Pass | Fail |');
  L.push('|---|---|---|---|---|');
  const groups = [...new Set(rows.map((r) => r.group))];
  for (const g of groups) {
    const rs = rows.filter((r) => r.group === g);
    L.push(
      `| ${escapeCell(g)} | ${rs[0].objective} | ${rs.length} | ${rs.filter((r) => r.status === 'passed').length} | ${rs.filter((r) => r.status === 'failed').length} |`,
    );
  }
  L.push('');

  L.push('## Chi tiết từng test case');
  L.push('');
  let id = 0;
  for (const g of groups) {
    L.push(`### ${escapeCell(g)}`);
    L.push('');
    L.push('| Mã | Test case | Kết quả |');
    L.push('|---|---|---|');
    for (const r of rows.filter((x) => x.group === g)) {
      id += 1;
      L.push(`| TC-${String(id).padStart(3, '0')} | ${escapeCell(r.name)} | ${label(r.status)} |`);
    }
    L.push('');
  }

  return L.join('\n');
}

const data = runJest();
const rows = collect(data);
fs.writeFileSync(OUT, `${build(rows, data)}\n`, 'utf8');

const passed = rows.filter((r) => r.status === 'passed').length;
const failed = rows.filter((r) => r.status === 'failed').length;
console.log(`${rows.length} test case: ${passed} pass, ${failed} fail`);
console.log(`Đã ghi ${path.relative(process.cwd(), OUT)}`);
if (failed > 0) {
  console.log('\nCó test trượt. Bảng vẫn ghi đúng sự thật, nhưng nên sửa trước khi nộp.');
}
