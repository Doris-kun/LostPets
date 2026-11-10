/**
 * Đo thông lượng của /pets, có index và không có index.
 *
 * Cách dùng:
 *   node scripts/bench-list.js              # 3000 tin
 *   SEED=10000 node scripts/bench-list.js
 *
 * Chạy trên mongodb-memory-server nên KHÔNG phải số của Render. Mục đích là so
 * sánh hai cấu hình trên cùng một máy, cùng một dữ liệu. Mà vì bản in-memory
 * không phải đọc đĩa, phần lợi đo được ở đây là mức SÀN: trên Atlas M0 với CPU
 * chia sẻ, quét toàn bộ collection còn đắt hơn nữa.
 */
const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Ô tìm kiếm bị chặn 60 lượt/10 phút để không đốt quota Gemini. Lúc đo phải
// nới ra, nếu không thì từ lượt 61 trở đi toàn bộ là 429 và con số thu được là
// thông lượng của đường TRẢ LỖI, không phải của đường tìm kiếm.
process.env.SEARCH_RATE_LIMIT = '100000000';

// CHẶN HẲN ĐƯỜNG RA GEMINI.
//
// Script này nạp .env qua app.js, nên nếu để nguyên khoá thì mỗi lượt đo gọi
// Gemini thật và đốt quota thật — gói miễn phí chỉ cho 100 lượt nhúng mỗi
// phút cho CẢ dự án. Đã bị một lần, nên để ở đây chứ không dựa vào ai nhớ.
//
// Không có khoá thì embedQuery trả null và searchByMeaning lui về lọc theo
// chữ. Phần đắt cần đo vẫn còn nguyên: nó vẫn kéo 500 tin kèm vector về.
process.env.GEMINI_API_KEY = '';
process.env.GOOGLE_API_KEY = '';

const SEED = Number(process.env.SEED || 3000);
const DURATION_MS = Number(process.env.DURATION || 4000);
const CONCURRENCY = Number(process.env.CONCURRENCY || 20);
// Chạy nhiều vòng rồi lấy trung vị. Một vòng đơn lẻ lệch tới 15% giữa hai lần
// chạy cùng cấu hình — lớn hơn cả phần lợi cần đo, nên một vòng là vô nghĩa.
const ROUNDS = Number(process.env.ROUNDS || 3);
// Mỗi đường đo hai lần, có và không có Accept-Encoding, XEN KẼ trong cùng một
// tiến trình. So hai lần chạy riêng thì vô nghĩa: cùng một cấu hình đã lệch
// tới 38% giữa hai lần, lớn hơn hẳn phần nén thay đổi.
//
// Lưu ý: trình tạo tải này bỏ luôn phần thân phản hồi, nên nó đo giá nén ở
// MÁY CHỦ, không đo phần giải nén ở trình duyệt.

const SPECIES = ['Mèo', 'Chó', 'Chim', 'Khác'];
const AREAS = ['Quận 1', 'Quận 7', 'Quận 12', 'Gò Vấp', 'Bình Thạnh'];

// Ba đường đi thật của web, không phải ba truy vấn bịa ra.
const ROUTES = [
  { label: 'danh sách trang đầu', path: '/pets?limit=9&skip=0&sort=newest' },
  { label: 'lọc loại + loài',     path: '/pets?limit=9&skip=0&sort=newest&type=lost&species=M%C3%A8o' },
  { label: 'tìm theo nghĩa',      path: '/pets?limit=9&skip=0&q=m%C3%A8o%20%C4%91en' },
];

function seedDocs(n) {
  const now = Date.now();
  const docs = [];
  for (let i = 0; i < n; i++) {
    docs.push({
      // type theo i % 2 mà species theo i % 4 thì hai trường DÍNH NHAU: mọi
      // tin 'lost' sẽ chỉ nhận hai loài, và /pets?type=lost&species=Mèo khớp
      // không bản ghi nào. Đo trên tập rỗng ra kết quả ngược hẳn. Chia cho 2
      // trước khi lấy dư để loài độc lập với loại.
      type: i % 2 ? 'lost' : 'found',
      species: SPECIES[Math.floor(i / 2) % SPECIES.length],
      breed: `Giống ${i % 40}`,
      color: i % 3 ? 'Nâu trắng' : 'Đen',
      area: AREAS[i % AREAS.length],
      contact: `09${String(i).padStart(8, '0')}`,
      description: `Tin thử nghiệm số ${i}, dùng để đo thông lượng.`,
      resolved: Math.floor(i / 2) % 10 === 0,
      date: new Date(now - i * 60000),
      // Vector giả, đúng số chiều thật (768) để đo đúng khối lượng dữ liệu mà
      // đường tìm theo nghĩa phải kéo về. Chỉ gắn cho phần đầu: searchByMeaning
      // lấy 500 tin theo thứ tự tự nhiên, nên 600 bản ghi có vector là đủ, mà
      // không phải giữ 20.000 x 768 số trong bộ nhớ.
      embedding: i < 600
        ? Array.from({ length: 768 }, (_, k) => ((i + k) % 100) / 100)
        : [],
    });
  }
  return docs;
}

// Trình tạo tải tối giản, viết bằng thư viện có sẵn của Node. Không phải công
// cụ benchmark đã hiệu chuẩn — đủ để so hai cấu hình, đừng mang số này đi so
// với web khác.
function drive(port, path, ms, concurrency, gzip = false) {
  return new Promise((resolve) => {
    const agent = new http.Agent({ keepAlive: true, maxSockets: concurrency });
    const latencies = [];
    const codes = new Map();
    let done = 0;
    let errors = 0;
    let stop = false;
    let running = 0;

    const started = Date.now();

    const fire = () => {
      if (stop) {
        if (running === 0) finish();
        return;
      }
      running += 1;
      const t0 = process.hrtime.bigint();
      const req = http.get({
        port, path, agent,
        headers: gzip ? { 'Accept-Encoding': 'gzip' } : {},
      }, (res) => {
        res.resume();
        res.on('end', () => {
          latencies.push(Number(process.hrtime.bigint() - t0) / 1e6);
          codes.set(res.statusCode, (codes.get(res.statusCode) || 0) + 1);
          if (res.statusCode !== 200) errors += 1;
          done += 1;
          running -= 1;
          fire();
        });
      });
      req.on('error', () => {
        codes.set('net', (codes.get('net') || 0) + 1);
        errors += 1; running -= 1; fire();
      });
    };

    const finish = () => {
      const seconds = (Date.now() - started) / 1000;
      latencies.sort((a, b) => a - b);
      const at = (p) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))] || 0;
      resolve({
        rps: done / seconds,
        p50: at(0.5),
        p95: at(0.95),
        errors,
        codes: [...codes].map(([c, n]) => `${c}:${n}`).join(' '),
      });
    };

    setTimeout(() => { stop = true; }, ms);
    for (let i = 0; i < concurrency; i++) fire();
  });
}

const fmt = (n, d = 1) => n.toFixed(d);

async function explainStages(Pet) {
  const plan = await Pet.find({}).sort({ date: -1 }).limit(9)
    .explain('queryPlanner');
  const stages = [];
  let node = plan.queryPlanner.winningPlan;
  // MongoDB 6+ bọc kế hoạch trong queryPlan; đi xuống theo cả hai dạng.
  node = node.queryPlan || node;
  while (node) {
    stages.push(node.stage);
    node = node.inputStage || node.inputStages?.[0];
  }
  return stages.join(' <- ');
}

async function phase(name, Pet, port) {
  const stages = await explainStages(Pet);
  console.log(`\n--- ${name} ---`);
  console.log(`kế hoạch truy vấn danh sách: ${stages}`);
  const rows = [];
  for (const route of ROUTES) {
    // Vòng khởi động, bỏ kết quả: lượt đầu phải nạp kế hoạch truy vấn và làm
    // nóng cache của mongod, không đại diện cho trạng thái chạy thật.
    await drive(port, route.path, 800, CONCURRENCY);

    const plain = [];
    const gzipped = [];
    for (let i = 0; i < ROUNDS; i++) {
      plain.push(await drive(port, route.path, DURATION_MS, CONCURRENCY, false));
      gzipped.push(await drive(port, route.path, DURATION_MS, CONCURRENCY, true));
    }
    const median = (runs) => {
      runs.sort((a, b) => a.rps - b.rps);
      const m = runs[Math.floor(runs.length / 2)];
      m.spread = (runs[runs.length - 1].rps - runs[0].rps) / m.rps;
      return m;
    };
    const r = median(plain);
    r.gz = median(gzipped);
    rows.push({ label: route.label, ...r });
    console.log(
      `${route.label.padEnd(22)} ${fmt(r.rps).padStart(8)} req/s`
      + `   p50 ${fmt(r.p50).padStart(7)}ms   p95 ${fmt(r.p95).padStart(7)}ms`
      + `   lệch ${fmt(r.spread * 100, 0)}%`
      + `   | nén: ${fmt(r.gz.rps).padStart(8)} req/s (lệch ${fmt(r.gz.spread * 100, 0)}%)`
    );
  }
  return { stages, rows };
}

async function main() {
  console.log(`Đang dựng MongoDB trong bộ nhớ và nạp ${SEED} tin...`);
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());

  const Pet = require('../api/models/petModel');
  const app = require('../app');

  // insertMany bỏ qua setter nfc/fuzz, nhưng dữ liệu thử đã ở dạng NFC sẵn.
  const docs = seedDocs(SEED);
  for (let i = 0; i < docs.length; i += 500) {
    await Pet.collection.insertMany(docs.slice(i, i + 500));
  }
  console.log(`Đã nạp ${await Pet.countDocuments()} tin.`);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;

  // TRƯỚC: bỏ hết index trừ _id, đúng trạng thái web đang chạy hôm nay.
  await Pet.collection.dropIndexes().catch(() => {});
  const before = await phase('TRƯỚC khi có index', Pet, port);

  // SAU: dựng đúng các index khai báo trong schema.
  await Pet.syncIndexes();
  const idx = await Pet.collection.indexes();
  console.log(`\nIndex đã dựng: ${idx.map((i) => i.name).join(', ')}`);
  const after = await phase('SAU khi có index', Pet, port);

  console.log('\n=== Thay đổi ===');
  for (let i = 0; i < before.rows.length; i++) {
    const b = before.rows[i];
    const a = after.rows[i];
    if (b.errors || a.errors) {
      console.log(`${b.label.padEnd(22)} BỎ QUA — có request lỗi, số đo không dùng được`);
      continue;
    }
    const times = a.rps / b.rps;
    const noise = Math.max(b.spread, a.spread);
    const effect = Math.abs(times - 1);
    const verdict = effect <= noise
      ? 'KHÔNG KẾT LUẬN ĐƯỢC — chênh lệch nhỏ hơn mức nhiễu'
      : `${times >= 1 ? 'nhanh hơn' : 'chậm hơn'} ${fmt(times >= 1 ? times : 1 / times, 2)} lần`;
    console.log(
      `${b.label.padEnd(22)} ${fmt(b.rps)} -> ${fmt(a.rps)} req/s`
      + `   (${verdict})`
      + `   p95 ${fmt(b.p95)}ms -> ${fmt(a.p95)}ms`
    );
  }

  server.close();
  await mongoose.disconnect();
  await mem.stop();
}

main().catch((err) => { console.error(err); process.exit(1); });
