const { GoogleGenAI } = require('@google/genai');

// Tầng tái xếp hạng của đường tìm kiếm (mục tiêu B07, proposal mục 6.3).
//
// Vector là bi-encoder: câu hỏi và tin đăng được nhúng RIÊNG RẼ rồi mới so
// với nhau, nên model không bao giờ nhìn thấy hai bên cùng lúc. Nó bắt được
// "giống nhau đại khái" nhưng bỏ sót chi tiết phân biệt — "mèo tai sứt" và
// "mèo tai lành" nhúng ra hai vector gần như trùng nhau, vì khác nhau đúng
// một từ trong một câu dài.
//
// Tầng này cho model đọc câu hỏi VÀ tin đăng trong cùng một lượt, nên nó so
// được từng chi tiết với nhau. Đổi lại đắt hơn nhiều, nên chỉ chấm lại một
// nhúm đầu danh sách chứ không chấm cả kho.
//
// NÓ CHỈ ĐƯỢC SẮP LẠI THỨ TỰ, KHÔNG ĐƯỢC LOẠI BỎ. Lý do không đặt ngưỡng đã
// ghi ở searchByMeaning và không đổi: với web tìm thú cưng, bỏ sót nguy hiểm
// hơn thừa. Một tin bị model chấm 5 điểm vẫn phải nằm trong danh sách, chỉ là
// nằm dưới cùng.

const MODEL = 'gemini-3.5-flash-lite';
const GENERATION_CONFIG = { thinking_level: 'minimal' };
const HTTP_OPTIONS = { retryOptions: { attempts: 2, initialDelay: 0.5, maxDelay: 2 } };

// Chỉ chấm lại 10 tin đầu. Người ta hiếm khi xem quá trang đầu, mà mỗi tin
// thêm vào là thêm chữ cho model đọc và thêm thời gian chờ.
const RERANK_POOL = 10;

// Dưới ngưỡng này coi như người ta đang tra từ khoá ("poodle", số điện thoại)
// chứ không mô tả bằng câu. Tra từ khoá thì vector đã đủ, chấm lại chỉ tổ bắt
// người ta chờ thêm vài giây không để làm gì.
const MIN_QUERY_WORDS = 4;

const getTimeoutMs = () => Number(process.env.RERANK_TIMEOUT_MS) || 15000;

// MẶC ĐỊNH TẮT. Bật bằng SEARCH_RERANK=on.
//
// Tắt không phải vì nó không chạy, mà vì đã đo rồi và cái giá không đáng
// (scripts/eval-matching.js --search, 20 câu hỏi):
//
//                    chỉ vector    + tái xếp hạng
//   precision@1          65%            100%
//   precision@3         100%            100%
//   thời gian/lượt      437ms          5509ms
//
// Nó đẩy đáp án từ vị trí 2-3 lên vị trí 1, nhưng precision@3 vốn đã 100% —
// người dùng vẫn thấy đúng tin đó trên màn hình dù không bật, chỉ lệch xuống
// một hàng. Đổi lại là NĂM GIÂY chờ thêm trên mỗi lượt tìm, mà năm giây trong
// một ô tìm kiếm thì người ta tưởng web hỏng chứ không ngồi đợi.
//
// Thêm nữa mỗi lượt tìm thành một lượt gọi model, tức đốt quota miễn phí theo
// đúng cái cách mà bộ chặn tần suất ở petRoutes được dựng lên để đề phòng.
//
// Giữ lại và bật được vì có lúc nó đáng: kho tin lớn hơn nhiều, hoặc chạy demo
// cho người chấm xem tầng này làm gì.
const isEnabled = () => String(process.env.SEARCH_RERANK || 'off').toLowerCase() === 'on';

const countWords = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length;

const shouldRerank = (q) => isEnabled() && countWords(q) >= MIN_QUERY_WORDS;

let client = null;
function getClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: HTTP_OPTIONS });
  return client;
}

const RANKING_SCHEMA = {
  type: 'object',
  properties: {
    ranking: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer', description: 'Số thứ tự tin đã nêu trong đề bài.' },
          score: { type: 'integer', description: 'Mức khớp với câu hỏi, từ 0 đến 100.' },
        },
        required: ['index', 'score'],
      },
    },
  },
  required: ['ranking'],
};

const describe = (pet) =>
  [
    `Loại tin: ${pet.type === 'lost' ? 'mất' : 'nhặt được'}`,
    `Loài: ${pet.species}`,
    `Giống: ${pet.breed}`,
    `Màu: ${pet.color}`,
    `Khu vực: ${pet.area}`,
    pet.name ? `Tên: ${pet.name}` : null,
    pet.description ? `Mô tả: ${pet.description}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('rerank timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Sắp lại `pets` theo mức khớp với `q`.
 *
 * Luôn trả về ĐỦ số phần tử đã nhận vào. Hỏng ở bất kỳ khâu nào — thiếu key,
 * hết quota, quá giờ, model trả rác — thì trả lại nguyên thứ tự cũ. Tìm kiếm
 * không được phép gãy chỉ vì tầng làm đẹp phía sau không chạy.
 */
async function rerank(q, pets) {
  if (!Array.isArray(pets) || pets.length < 2) return pets;
  const ai = getClient();
  if (!ai) return pets;

  const head = pets.slice(0, RERANK_POOL);
  const tail = pets.slice(RERANK_POOL);

  const prompt = [
    'Bạn giúp một website tìm thú cưng thất lạc ở Việt Nam xếp lại kết quả tìm kiếm.',
    'Dưới đây là câu người dùng gõ vào ô tìm kiếm, rồi tới các tin đăng ứng viên.',
    'Hãy chấm mỗi tin theo mức khớp với câu hỏi, từ 0 đến 100.',
    'Chú ý các chi tiết phân biệt: đặc điểm riêng trên cơ thể, giống, màu, khu vực.',
    'Một chi tiết trái ngược hẳn thì cho điểm thấp, dù phần còn lại có giống.',
    'Chấm đủ mọi tin, không bỏ sót tin nào.',
    '',
    `CÂU HỎI: ${q}`,
    '',
    ...head.map((pet, i) => `TIN ${i} — ${describe(pet)}`),
  ].join('\n');

  let parsed;
  try {
    const interaction = await withTimeout(
      ai.interactions.create({
        model: MODEL,
        input: [{ type: 'text', text: prompt }],
        response_format: { type: 'text', mime_type: 'application/json', schema: RANKING_SCHEMA },
        generation_config: GENERATION_CONFIG,
      }),
      getTimeoutMs(),
    );
    parsed = JSON.parse(interaction.output_text);
  } catch {
    return pets;
  }

  const scores = new Map();
  for (const row of (parsed && parsed.ranking) || []) {
    if (Number.isInteger(row.index) && head[row.index] && Number.isFinite(row.score)) {
      scores.set(row.index, row.score);
    }
  }
  if (scores.size === 0) return pets;

  // Tin model quên chấm giữ nguyên hạng cũ bằng cách cho điểm theo vị trí ban
  // đầu — không bị đẩy lên đầu cũng không bị vứt xuống đáy một cách tuỳ tiện.
  const ordered = head
    .map((pet, i) => ({ pet, i, score: scores.has(i) ? scores.get(i) : -1 }))
    .sort((a, b) => (b.score - a.score) || (a.i - b.i))
    .map((row) => row.pet);

  return ordered.concat(tail);
}

module.exports = { rerank, shouldRerank, isEnabled, RERANK_POOL, MIN_QUERY_WORDS };
