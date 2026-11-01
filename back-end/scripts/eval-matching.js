/**
 * Đo độ chính xác của tính năng so khớp Lost<->Found (mục tiêu B11, Objective 3).
 *
 *   npm run eval:matching                 chỉ đo tầng truy hồi, không gọi API, miễn phí
 *   npm run eval:matching -- --vector     đo thêm cách xếp hạng bằng vector (cần GEMINI_API_KEY)
 *   npm run eval:matching -- --ai         đo thêm đầu-cuối qua đúng endpoint thật (chậm, tốn lượt)
 *   npm run eval:matching -- --report     ghi kết quả ra eval/results.md để dán vào báo cáo
 *
 * CHẠY TRÊN CƠ SỞ DỮ LIỆU TẠM TRONG BỘ NHỚ. Không chạm vào dữ liệu thật, không
 * cần mạng cho chế độ mặc định, và chạy lại bao nhiêu lần cũng ra cùng kết quả.
 *
 * Đo cái gì, và vì sao tách làm hai tầng:
 *
 *   Tầng 1 — TRUY HỒI. Tin đúng có lọt vào tập ứng viên hay không. Tầng này
 *   quyết định trần của mọi thứ phía sau: ứng viên đã bị cắt thì AI không có
 *   cơ hội nhìn thấy, nên top-3 accuracy không bao giờ vượt được recall@3.
 *
 *   Tầng 2 — CHẤM ĐIỂM. AI xếp lại và loại bớt trong số ứng viên nhận được.
 *   Tầng này chỉ có thể giữ nguyên hoặc làm giảm, không thể cứu một tin đã bị
 *   tầng 1 bỏ rơi.
 *
 * Tách ra vì nếu chỉ đo một con số đầu-cuối thì lúc nó thấp sẽ không biết nên
 * sửa chỗ nào. Đây cũng đúng cách proposal mục 6.3 yêu cầu: đánh giá từng tầng
 * riêng rẽ thay vì coi cả đường ống là hộp đen.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Pet = require('../api/models/petModel');
const { candidateFilter, MAX_CANDIDATES } = require('../api/lib/matching');
const { textForPet, embedDocument, embedQuery, cosine } = require('../api/lib/embedding');

const EVAL_DIR = path.join(__dirname, '..', 'eval');
const DATASET = path.join(EVAL_DIR, 'dataset.json');
const CACHE = path.join(EVAL_DIR, '.embeddings-cache.json');
const REPORT = path.join(EVAL_DIR, 'results.md');

const K_VALUES = [1, 3, 5, 10];
const TARGET_RECALL = 0.7; // Objective 3: >= 70% top-3

const args = process.argv.slice(2);
const useVector = args.includes('--vector');
const useAi = args.includes('--ai');
const useSearch = args.includes('--search');
const writeReport = args.includes('--report');

const pct = (n, d) => (d === 0 ? 0 : Math.round((n / d) * 1000) / 10);
const bar = (p) => '#'.repeat(Math.round(p / 5)).padEnd(20, '.');

// ---------------------------------------------------------------- dữ liệu

// Mã tin trung tính, cố ý KHÔNG dùng khoá của bộ dữ liệu.
//
// textForPet() có nhét postId vào văn bản đem đi nhúng. Nếu đặt postId là
// 'p01-lost' và 'p01-found' thì hai tin cùng cặp chia nhau chuỗi 'p01', và
// vector sẽ khớp nhờ đáp án rò vào đề bài chứ không nhờ ngữ nghĩa. Con số đo
// được khi đó đẹp nhưng vô giá trị.
const neutralPostId = (i) => `LP${String(i + 1).padStart(4, '0')}`;

async function seed() {
  const raw = JSON.parse(fs.readFileSync(DATASET, 'utf8'));
  const meta = new Map(); // _id -> { key, pairId }
  const docs = raw.pets.map((p, i) => ({
    postId: neutralPostId(i),
    type: p.type,
    species: p.species,
    breed: p.breed,
    color: p.color,
    area: p.area,
    contact: p.contact,
    name: p.name || '',
    description: p.description,
    date: new Date(Date.now() - p.daysAgo * 24 * 60 * 60 * 1000),
  }));
  const saved = await Pet.insertMany(docs);
  saved.forEach((doc, i) => meta.set(String(doc._id), { key: raw.pets[i].key, pairId: raw.pets[i].pairId }));
  return { raw, saved, meta };
}

// ------------------------------------------------------------- embeddings

// Bộ nhớ đệm theo nội dung văn bản. Chạy lại lần hai không tốn lượt gọi nào —
// đúng biện pháp giảm thiểu đã ghi ở rủi ro R01 trong proposal.
const loadCache = () => {
  try {
    return JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  } catch {
    return {};
  }
};
const hash = (text, kind) => crypto.createHash('sha1').update(`${kind}:${text}`).digest('hex');

async function embedAll(pets, meta) {
  const cache = loadCache();
  const vectors = new Map();
  let called = 0;

  for (const pet of pets) {
    const text = textForPet(pet);
    // Tin báo mất đóng vai câu hỏi, tin nhặt được đóng vai tài liệu. Gemini
    // dùng hai task type khác nhau cho hai vai, nên phải nhúng đúng vai.
    const kind = pet.type === 'lost' ? 'query' : 'document';
    const key = hash(text, kind);
    if (!cache[key]) {
      cache[key] = kind === 'query' ? await embedQuery(text) : await embedDocument(text);
      called += 1;
      if (called % 10 === 0) process.stdout.write(`\r  đang nhúng... ${called} lượt gọi mới`);
    }
    vectors.set(String(pet._id), cache[key]);
  }

  // Ghi vector vao chinh ban ghi.
  //
  // findCandidates doc embedding tu co so du lieu chu khong nhan tu ngoai vao.
  // Khong ghi thi endpoint that se thay tin khong co vector va roi ve nhanh du
  // phong xep theo ngay - phep do dau-cuoi khi do do nham nhanh, va con so tra
  // ve giong het bang chua sua. Da dinh dung cai bay nay mot lan.
  await Promise.all(
    [...vectors].map(([id, vector]) => Pet.updateOne({ _id: id }, { $set: { embedding: vector } })),
  );

  fs.writeFileSync(CACHE, JSON.stringify(cache));
  if (called > 0) process.stdout.write(`\r  đã nhúng xong, ${called} lượt gọi mới\n`);
  else console.log('  tất cả đã có sẵn trong bộ nhớ đệm, không gọi API lần nào');
  return vectors;
}

// ------------------------------------------------------------------- đo

// Trả về thứ hạng (bắt đầu từ 1) của tin đúng trong tập ứng viên đã sắp xếp,
// hoặc 0 nếu tin đúng không hề lọt qua bộ lọc cứng.
const rankOf = (ordered, truthId) => {
  const i = ordered.findIndex((d) => String(d._id) === truthId);
  return i === -1 ? 0 : i + 1;
};

async function measure(meta, vectors) {
  const byPair = new Map();
  for (const [id, m] of meta) {
    if (!m.pairId) continue;
    const entry = byPair.get(m.pairId) || {};
    entry[m.key.endsWith('-lost') ? 'lost' : 'found'] = id;
    byPair.set(m.pairId, entry);
  }

  const cases = [];
  for (const [pairId, pair] of byPair) {
    const source = await Pet.findById(pair.lost);
    const pool = await Pet.find(candidateFilter(source)).lean();

    const byDate = pool.slice().sort((a, b) => b.date - a.date);
    const row = {
      pairId,
      species: source.species,
      area: source.area,
      poolSize: pool.length,
      rankDate: rankOf(byDate, pair.found),
      rankVector: 0,
    };

    if (vectors) {
      const q = vectors.get(pair.lost);
      const byVector = pool
        .slice()
        .sort((a, b) => cosine(q, vectors.get(String(b._id))) - cosine(q, vectors.get(String(a._id))));
      row.rankVector = rankOf(byVector, pair.found);
    }
    cases.push(row);
  }
  return cases.sort((a, b) => a.pairId.localeCompare(b.pairId));
}

// recall@k: tin đúng nằm trong k vị trí đầu. rank = 0 nghĩa là trượt bộ lọc cứng.
const recallAt = (cases, field, k) => cases.filter((c) => c[field] > 0 && c[field] <= k).length;

const groupBy = (cases, field) => {
  const groups = new Map();
  for (const c of cases) {
    if (!groups.has(c[field])) groups.set(c[field], []);
    groups.get(c[field]).push(c);
  }
  return groups;
};

// ------------------------------------------------------------- đầu-cuối

// Gọi đúng endpoint thật qua HTTP thay vì gọi lại logic. Đo cái người dùng
// thực sự nhận được, kể cả phần AI loại bớt theo MIN_SCORE.
async function measureEndToEnd(meta) {
  const request = require('supertest');
  const app = require('../app');
  const byPair = new Map();
  for (const [id, m] of meta) {
    if (!m.pairId) continue;
    const entry = byPair.get(m.pairId) || {};
    entry[m.key.endsWith('-lost') ? 'lost' : 'found'] = id;
    byPair.set(m.pairId, entry);
  }

  const rows = [];
  let i = 0;
  for (const [pairId, pair] of byPair) {
    i += 1;
    process.stdout.write(`\r  đang gọi endpoint thật... ${i}/${byPair.size}`);
    const res = await request(app).get(`/ai/match/${pair.lost}`);
    const matches = (res.body && res.body.matches) || [];
    const rank = matches.findIndex((m) => m.pet && String(m.pet._id) === pair.found) + 1;
    rows.push({ pairId, status: res.status, returned: matches.length, rank });
  }
  process.stdout.write('\n');
  return rows;
}

// --------------------------------------------------- đường TÌM KIẾM (B07)

// Đo đường tìm kiếm, không phải đường so khớp. Hai đường khác nhau: so khớp
// bắt đầu từ một tin có sẵn, tìm kiếm bắt đầu từ câu người ta gõ vào ô.
//
// Câu hỏi dùng chính phần mô tả của tin báo mất, còn đáp án là tin nhặt được
// cùng cặp. Hai tin ấy được viết bằng từ ngữ khác hẳn nhau, nên đây đúng là
// bài toán proposal mục 2.2 nêu ra: tìm ra nhau dù không chung chữ nào.
//
// Gọi qua HTTP thật để đo cả phần nối dây, không chỉ đo hàm xếp hạng.
async function measureSearch(meta, label) {
  const request = require('supertest');
  const app = require('../app');
  const byPair = new Map();
  for (const [id, m] of meta) {
    if (!m.pairId) continue;
    const entry = byPair.get(m.pairId) || {};
    entry[m.key.endsWith('-lost') ? 'lost' : 'found'] = id;
    byPair.set(m.pairId, entry);
  }

  const rows = [];
  let i = 0;
  for (const [pairId, pair] of byPair) {
    i += 1;
    process.stdout.write(`\r  ${label}... ${i}/${byPair.size}`);
    const lost = await Pet.findById(pair.lost);
    const started = Date.now();
    const res = await request(app)
      .get('/pets')
      .query({ q: lost.description, type: 'found', limit: 60 });
    const pets = (res.body && res.body.pets) || [];
    rows.push({
      pairId,
      status: res.status,
      rank: pets.findIndex((p) => String(p._id) === pair.found) + 1,
      ms: Date.now() - started,
    });
  }
  process.stdout.write('\n');
  return rows;
}

const hitsAt = (rows, k) => rows.filter((r) => r.rank > 0 && r.rank <= k).length;

// Trung vị chứ không trung bình: một lượt gọi nghẽn 20 giây sẽ kéo lệch trung
// bình và làm người đọc tưởng mọi lượt tìm đều chậm như thế.
const medianMs = (rows) => {
  const xs = rows.map((r) => r.ms).sort((a, b) => a - b);
  return xs.length ? xs[Math.floor(xs.length / 2)] : 0;
};

// ---------------------------------------------------------------- in ấn

function section(title) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

function printRecallTable(cases, field, label) {
  section(`${label} — trên ${cases.length} cặp`);
  for (const k of K_VALUES) {
    const hit = recallAt(cases, field, k);
    const p = pct(hit, cases.length);
    const flag = k === MAX_CANDIDATES ? (p >= TARGET_RECALL * 100 ? '  ĐẠT' : '  CHƯA ĐẠT') : '';
    console.log(`  recall@${String(k).padEnd(2)} ${bar(p)} ${String(p).padStart(5)}%  (${hit}/${cases.length})${flag}`);
  }
  const missed = cases.filter((c) => c[field] === 0);
  if (missed.length) {
    console.log(`  trượt bộ lọc cứng hoàn toàn: ${missed.map((c) => c.pairId).join(', ')}`);
  }
}

function printBreakdown(cases, field, by, label) {
  section(`Phân tách theo ${label} (recall@${MAX_CANDIDATES})`);
  for (const [name, rows] of groupBy(cases, by)) {
    const hit = recallAt(rows, field, MAX_CANDIDATES);
    console.log(`  ${String(name).padEnd(22)} ${String(pct(hit, rows.length)).padStart(5)}%  (${hit}/${rows.length})`);
  }
}

function buildReport(cases, endToEnd, search) {
  const lines = [];
  const stamp = new Date().toISOString().slice(0, 10);
  lines.push('# Kết quả đo độ chính xác so khớp Lost↔Found');
  lines.push('');
  lines.push(`Chạy ngày ${stamp} · ${cases.length} cặp gán nhãn · sinh tự động bởi \`scripts/eval-matching.js\``);
  lines.push('');
  lines.push('## Tầng truy hồi');
  lines.push('');
  lines.push(`| k | xếp theo ngày (cách cũ) | ${useVector ? 'xếp theo vector (đang chạy thật)' : '—'} |`);
  lines.push('|---|---|---|');
  for (const k of K_VALUES) {
    const d = pct(recallAt(cases, 'rankDate', k), cases.length);
    const v = useVector ? `${pct(recallAt(cases, 'rankVector', k), cases.length)}%` : '—';
    lines.push(`| recall@${k} | ${d}% | ${v} |`);
  }
  lines.push('');
  lines.push(`Tập ứng viên trung bình: ${Math.round((cases.reduce((s, c) => s + c.poolSize, 0) / cases.length) * 10) / 10} tin sau bộ lọc cứng, bị cắt còn ${MAX_CANDIDATES} trước khi AI chấm.`);
  lines.push('');
  lines.push('## Phân tách theo loài');
  lines.push('');
  lines.push('| Loài | recall@3 (ngày) | recall@3 (vector) | số cặp |');
  lines.push('|---|---|---|---|');
  for (const [name, rows] of groupBy(cases, 'species')) {
    const d = pct(recallAt(rows, 'rankDate', MAX_CANDIDATES), rows.length);
    const v = useVector ? `${pct(recallAt(rows, 'rankVector', MAX_CANDIDATES), rows.length)}%` : '—';
    lines.push(`| ${name} | ${d}% | ${v} | ${rows.length} |`);
  }
  lines.push('');
  if (endToEnd) {
    const hit = endToEnd.filter((r) => r.rank > 0).length;
    lines.push('## Đầu-cuối qua endpoint thật');
    lines.push('');
    lines.push(`top-3 accuracy: **${pct(hit, endToEnd.length)}%** (${hit}/${endToEnd.length})`);
    lines.push('');
  }
  if (search) {
    lines.push('## Đường tìm kiếm — tầng tái xếp hạng (B07)');
    lines.push('');
    lines.push('Câu hỏi là phần mô tả của tin báo mất, đáp án là tin nhặt được cùng cặp.');
    lines.push('Hai lượt đo chỉ khác nhau biến `SEARCH_RERANK`.');
    lines.push('');
    lines.push('| k | chỉ vector | vector + tái xếp hạng |');
    lines.push('|---|---|---|');
    for (const k of K_VALUES) {
      lines.push(`| precision@${k} | ${pct(hitsAt(search.base, k), search.base.length)}% | ${pct(hitsAt(search.ranked, k), search.ranked.length)}% |`);
    }
    lines.push(`| thời gian mỗi lượt (trung vị) | ${medianMs(search.base)}ms | ${medianMs(search.ranked)}ms |`);
    lines.push('');
  }
  lines.push('## Chi tiết từng cặp');
  lines.push('');
  lines.push('| Cặp | Loài | Khu vực | Số ứng viên | Hạng (ngày) | Hạng (vector) |');
  lines.push('|---|---|---|---|---|---|');
  for (const c of cases) {
    const d = c.rankDate === 0 ? 'trượt lọc' : c.rankDate;
    const v = !useVector ? '—' : c.rankVector === 0 ? 'trượt lọc' : c.rankVector;
    lines.push(`| ${c.pairId} | ${c.species} | ${c.area} | ${c.poolSize} | ${d} | ${v} |`);
  }
  lines.push('');
  fs.writeFileSync(REPORT, `${lines.join('\n')}\n`, 'utf8');
  console.log(`\nĐã ghi ${path.relative(process.cwd(), REPORT)}`);
}

// ----------------------------------------------------------------- chạy

async function run() {
  if (useVector && !process.env.GEMINI_API_KEY) {
    console.error('Chế độ --vector cần GEMINI_API_KEY trong .env.');
    process.exit(1);
  }

  const server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri());

  try {
    const { raw, saved, meta } = await seed();
    const pairs = raw.pets.filter((p) => p.pairId).length / 2;
    console.log(`Đã nạp ${saved.length} tin vào cơ sở dữ liệu tạm: ${pairs} cặp đúng, ${saved.length - pairs * 2} tin nhiễu.`);

    let vectors = null;
    if (useVector) {
      console.log('\nNhúng vector:');
      vectors = await embedAll(saved, meta);
    }

    const cases = await measure(meta, vectors);

    const avgPool = Math.round((cases.reduce((s, c) => s + c.poolSize, 0) / cases.length) * 10) / 10;
    section('Bối cảnh');
    console.log(`  Sau bộ lọc cứng còn trung bình ${avgPool} ứng viên mỗi lượt.`);
    console.log(`  Duong chay that cat con ${MAX_CANDIDATES} ung vien roi moi dua AI cham.`);

    printRecallTable(cases, 'rankDate', 'Xếp theo NGÀY ĐĂNG (cách cũ, làm đối chứng)');
    if (useVector) {
      printRecallTable(cases, 'rankVector', 'Xếp theo VECTOR (cách đang chạy thật)');
    }
    printBreakdown(cases, useVector ? 'rankVector' : 'rankDate', 'species', 'loài');

    let endToEnd = null;
    if (useAi) {
      section('Đầu-cuối qua endpoint thật');
      endToEnd = await measureEndToEnd(meta);
      const hit = endToEnd.filter((r) => r.rank > 0).length;
      const failed = endToEnd.filter((r) => r.status !== 200);
      if (failed.length) console.log(`  ${failed.length} lượt gọi lỗi (status ${[...new Set(failed.map((f) => f.status))].join(', ')})`);
      console.log(`  top-3 accuracy: ${pct(hit, endToEnd.length)}% (${hit}/${endToEnd.length})`);
    }

    let search = null;
    if (useSearch) {
      // Hai lượt đo chỉ khác nhau một biến môi trường, chạy trên cùng dữ liệu,
      // cùng câu hỏi, cùng thứ tự. Khác biệt đo được là của riêng tầng tái
      // xếp hạng chứ không lẫn thứ gì khác.
      process.env.SEARCH_RATE_LIMIT = '1000';
      section('Đường tìm kiếm — có và không có tái xếp hạng (B07)');
      process.env.SEARCH_RERANK = 'off';
      const base = await measureSearch(meta, 'chỉ vector');
      process.env.SEARCH_RERANK = 'on';
      const ranked = await measureSearch(meta, 'vector + tái xếp hạng');
      search = { base, ranked };

      console.log(`\n  ${'k'.padEnd(4)} ${'chỉ vector'.padEnd(14)} vector + tái xếp hạng`);
      for (const k of K_VALUES) {
        const b = hitsAt(base, k);
        const r = hitsAt(ranked, k);
        const arrow = r > b ? ' tốt hơn' : r < b ? ' kém hơn' : ' như nhau';
        console.log(`  @${String(k).padEnd(3)} ${`${pct(b, base.length)}%`.padEnd(14)} ${`${pct(r, ranked.length)}%`.padEnd(8)}${arrow}`);
      }
      const mb = medianMs(base);
      const mr = medianMs(ranked);
      console.log(`\n  Thời gian mỗi lượt tìm (trung vị): ${mb}ms  ->  ${mr}ms  (+${mr - mb}ms)`);
    }

    if (writeReport) buildReport(cases, endToEnd, search);
  } finally {
    await mongoose.disconnect();
    await server.stop();
  }
}

run().catch((err) => {
  console.error('Hỏng:', err && err.message);
  process.exit(1);
});
