const { GoogleGenAI } = require('@google/genai');

const MODEL = 'gemini-embedding-001';

// 768 chiều là kết quả đo thật, không phải con số chọn bừa.
//
// Thử trên tập tin mẫu tiếng Việt với ba mức 256 / 768 / 3072:
// - Độ chính xác xếp hạng: 768 và 3072 đều đúng 8/8, 256 cũng 8/8.
// - Nhưng khả năng TÁCH câu hỏi rác khỏi câu hỏi thật thì 256 kém hẳn: câu
//   "xe máy Honda Wave bị mất" được 0.761, cao hơn cả câu tra số điện thoại
//   thật (0.715). Ở 768 thì rác tụt về 0.646 còn thật lên 0.788.
// - 3072 không tốt hơn 768 đáng kể mà nặng gấp bốn.
//
// 768 số kiểu double là khoảng 6KB mỗi tin. 500 tin hết 3MB, thoải mái so với
// 512MB của Atlas gói miễn phí.
const DIMENSIONS = 768;

// Câu hỏi và tài liệu phải nhúng bằng hai task type khác nhau, nếu không chất
// lượng tụt rõ. Đây là yêu cầu của model chứ không phải tuỳ chọn.
const TASK_DOCUMENT = 'RETRIEVAL_DOCUMENT';
const TASK_QUERY = 'RETRIEVAL_QUERY';

let client = null;
function getClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

// Gom các trường mô tả thành một đoạn văn để nhúng. Viết có nhãn ("Giống
// Corgi") thay vì nối trống ("Corgi") vì model đọc ngữ cảnh — "vàng" đứng một
// mình thì mơ hồ, "Màu vàng" thì rõ là màu lông.
//
// KHÔNG đưa contact và secretDetail vào. secretDetail là bí mật dùng để xác
// minh chủ thật; nhúng nó vào vector công khai là làm rò theo đường khác.
const textForPet = (pet = {}) => {
  const parts = [
    pet.type === 'found' ? 'Tin tìm thấy.' : 'Tin bị mất.',
    pet.species && `${pet.species}.`,
    pet.breed && `Giống ${pet.breed}.`,
    pet.color && `Màu ${pet.color}.`,
    pet.area && `Khu vực ${pet.area}.`,
    pet.name && `Tên ${pet.name}.`,
    pet.postId && `Mã tin ${pet.postId}.`,
    pet.description,
  ];
  return parts.filter(Boolean).join(' ').trim();
};

async function embed(text, taskType) {
  const ai = getClient();
  if (!ai || !text) return null;
  try {
    const res = await ai.models.embedContent({
      model: MODEL,
      contents: text,
      config: { taskType, outputDimensionality: DIMENSIONS },
    });
    const values = res && res.embeddings && res.embeddings[0] && res.embeddings[0].values;
    return Array.isArray(values) && values.length ? values : null;
  } catch (err) {
    // Nhúng hỏng không được phép làm hỏng việc chính. Tin vẫn phải đăng được
    // khi Gemini sập hay hết quota — chỉ là tin đó tạm thời không tìm theo
    // ngữ nghĩa được, chạy lại script nhúng bù là xong.
    console.error('Không nhúng được:', err && err.message);
    return null;
  }
}

const embedDocument = (text) => embed(text, TASK_DOCUMENT);

// Nhớ tạm vector của CÂU TÌM KIẾM.
//
// Vì sao cần: gói miễn phí của Gemini chặn 100 lượt nhúng mỗi phút cho CẢ dự
// án, không phải cho mỗi người. Đo được bằng chính lỗi nó trả về:
//   "limit: 100, model: gemini-embedding-1.0 ... Embed content requests per
//    minute limit exceeded on Free Tier"
// Tức là web chịu khoảng 100 lượt tìm mỗi phút rồi tắt tính năng tìm theo
// nghĩa, bất kể máy chủ còn rảnh bao nhiêu.
//
// Mà câu tìm kiếm LẶP LẠI rất nhiều: "mèo", "chó lạc quận 7", "mèo tam thể".
// Cùng một câu luôn cho cùng một vector, nên lần thứ hai trở đi không có lý
// gì gọi lại.
//
// Chỉ nhớ câu tìm kiếm, không nhớ nội dung tin: mỗi tin chỉ nhúng một lần
// trong đời nên nhớ lại chẳng ích gì.
const QUERY_CACHE_MAX = 500;
const queryCache = new Map();

// LRU dựa vào việc Map giữ đúng thứ tự chèn: đọc lại thì xoá rồi đặt lại để
// đẩy xuống cuối, hết chỗ thì bỏ khoá đầu tiên — tức khoá lâu nhất không ai
// dùng. 500 câu x 768 số ~ 3MB, không đáng kể so với 512MB của instance.
async function embedQuery(text) {
  if (!text) return null;
  const key = String(text);

  if (queryCache.has(key)) {
    const hit = queryCache.get(key);
    queryCache.delete(key);
    queryCache.set(key, hit);
    return hit;
  }

  const vector = await embed(key, TASK_QUERY);
  // KHÔNG nhớ khi hỏng. Nhớ null lại thì một phút hết quota sẽ đóng băng câu
  // đó vĩnh viễn, dù phút sau quota đã hồi.
  if (!vector) return null;

  queryCache.set(key, vector);
  if (queryCache.size > QUERY_CACHE_MAX) {
    queryCache.delete(queryCache.keys().next().value);
  }
  return vector;
}

// Cho test xoá giữa các lượt, cùng lý do với rateLimit.reset.
embedQuery.reset = () => queryCache.clear();
embedQuery.size = () => queryCache.size;

// Chia cho tích độ dài nên không cần chuẩn hoá vector trước. Model trả về
// vector chưa chuẩn hoá khi hạ số chiều xuống dưới 3072, dễ quên chỗ này.
const cosine = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
};

module.exports = { MODEL, DIMENSIONS, textForPet, embedDocument, embedQuery, cosine };
