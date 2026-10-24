const { GoogleGenAI } = require('@google/genai');
const multer = require('multer');

// gemini-3.8-flash bật suy luận mức medium theo mặc định: nhận diện một con chó
// mất tới 136 giây. Bản lite với thinking_level 'minimal' làm cùng việc đó trong
// khoảng 6 giây — đây là việc phân loại đơn giản, không cần model suy luận sâu.
const MODEL = 'gemini-3.5-flash-lite';
const GENERATION_CONFIG = { thinking_level: 'minimal' };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Ảnh đi thẳng từ bộ nhớ sang Gemini, không cần ghi ra đĩa.
exports.upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
}).single('image');

// Khởi tạo muộn: thiếu API key thì endpoint trả 503 thay vì làm sập server lúc start.
let client = null;
function getClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

// Bản free của Gemini có lúc nghẽn tới hàng phút. Render cắt kết nối ở khoảng
// 100 giây rồi trả 502, người dùng không hiểu chuyện gì xảy ra. Tự bỏ cuộc sớm
// hơn thế để còn trả về một thông báo tử tế.
// Đọc lúc gọi chứ không lúc nạp module, để test rút ngắn được mà không phải chờ thật.
// Hai việc có ngưỡng khác nhau: phân tích một ảnh là thao tác người dùng đang
// ngồi chờ ngay trên form, chờ quá lâu còn khó chịu hơn là báo hỏng sớm.
// Đối chiếu ghép tin gửi tới 4 ảnh nên tự nhiên lâu hơn, cho hạn rộng hơn.
const getAnalyzeTimeoutMs = () => Number(process.env.AI_TIMEOUT_MS) || 25000;
const getMatchTimeoutMs = () => Number(process.env.AI_TIMEOUT_MS) || 45000;

class AiTimeoutError extends Error {}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new AiTimeoutError('AI timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const PET_SCHEMA = {
  type: 'object',
  properties: {
    is_pet: {
      type: 'boolean',
      description: 'Ảnh có chứa chó hoặc mèo hay không.',
    },
    species: {
      type: 'string',
      enum: ['Chó', 'Mèo', 'Khác'],
      description: 'Loài của con vật trong ảnh.',
    },
    breed: {
      type: 'string',
      description: 'Giống, bằng tiếng Việt, ví dụ "Corgi", "Mèo mướp". Không chắc thì ghi "Không rõ".',
    },
    color: {
      type: 'string',
      description: 'Màu lông, bằng tiếng Việt, ví dụ "Nâu trắng", "Tam thể".',
    },
    description: {
      type: 'string',
      description: 'Một hoặc hai câu tiếng Việt mô tả đặc điểm nhận dạng: kích cỡ, vòng cổ, đốm, tai, đuôi.',
    },
    confidence: {
      type: 'integer',
      description: 'Mức độ chắc chắn về giống và màu, từ 0 đến 100.',
    },
  },
  required: ['is_pet', 'species', 'breed', 'color', 'description', 'confidence'],
};

const PROMPT = [
  'Bạn hỗ trợ một website đăng tin thú cưng thất lạc tại Việt Nam.',
  'Hãy nhìn ảnh này và ghi lại thông tin nhận dạng con vật.',
  'Nếu ảnh không phải chó hoặc mèo thì đặt is_pet = false.',
  'Mọi giá trị chữ phải bằng tiếng Việt. Không chắc thì ghi "Không rõ" thay vì đoán bừa.',
].join(' ');

exports.analyze_image = async (req, res) => {
  const ai = getClient();
  if (!ai) {
    return res.status(503).json({ message: 'AI chưa được cấu hình. Thiếu GEMINI_API_KEY.' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Chưa có ảnh để phân tích' });
  }

  if (!SUPPORTED_TYPES.includes(req.file.mimetype)) {
    return res.status(400).json({ message: 'Chỉ hỗ trợ ảnh JPEG, PNG, GIF hoặc WEBP' });
  }

  try {
    const interaction = await withTimeout(
      ai.interactions.create({
      model: MODEL,
      input: [
        { type: 'text', text: PROMPT },
        {
          type: 'image',
          data: req.file.buffer.toString('base64'),
          mime_type: req.file.mimetype,
        },
      ],
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: PET_SCHEMA,
      },
      generation_config: GENERATION_CONFIG,
      }),
      getAnalyzeTimeoutMs()
    );

    let result;
    try {
      result = JSON.parse(interaction.output_text);
    } catch {
      return res.status(502).json({ message: 'AI không trả về kết quả đọc được' });
    }

    if (!result.is_pet) {
      return res.status(422).json({ message: 'Ảnh này không phải chó hoặc mèo' });
    }

    res.json({
      species: result.species,
      breed: result.breed,
      color: result.color,
      description: result.description,
      confidence: result.confidence,
    });
  } catch (err) {
    if (err instanceof AiTimeoutError) {
      return res.status(504).json({ message: 'AI đang quá tải, thử lại sau ít phút' });
    }
    const status = err.status || (err.response && err.response.status);
    if (status === 401 || status === 403) {
      return res.status(503).json({ message: 'API key không hợp lệ' });
    }
    if (status === 429) {
      return res.status(429).json({ message: 'Đã hết lượt miễn phí, thử lại sau một chút' });
    }
    console.error('AI analyze error:', err.message);
    res.status(500).json({ message: 'Phân tích ảnh thất bại' });
  }
};

// ---------------------------------------------------------------------------
// Gợi ý ghép tin: tìm trong các tin ngược loại (mất <-> nhặt được) xem có tin
// nào khả năng là cùng một con vật không.
// ---------------------------------------------------------------------------

const mongoose = require('mongoose');
const Pet = require('../models/petModel');

const MAX_CANDIDATES = 3;
const CANDIDATE_WINDOW_DAYS = 120;
const MIN_SCORE = 40;
const IMAGE_FETCH_TIMEOUT_MS = 8000;
// Mỗi request gửi tối đa 4 ảnh. Giữ tổng dung lượng thấp hơn hẳn giới hạn của
// Gemini để không bao giờ chạm tới, kể cả khi người dùng tải ảnh máy ảnh.
const MATCH_IMAGE_MAX_BYTES = 1.5 * 1024 * 1024;

// Server tự tải ảnh rồi gửi kèm dạng base64, thay vì đưa URL cho Gemini tự lấy.
// Để Gemini tự lấy thì chỉ cần MỘT ảnh không truy cập được là cả request bị từ
// chối với "Cannot fetch content from the provided URL" — mất luôn kết quả của
// các ứng viên khác. Tải ở đây thì ảnh hỏng chỉ bị bỏ qua, phần đối chiếu bằng
// giống, màu, khu vực và thời gian vẫn chạy.
async function imagePart(url) {
  if (!url) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const mime = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
    if (!SUPPORTED_TYPES.includes(mime)) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MATCH_IMAGE_MAX_BYTES) return null;
    return { type: 'image', data: buffer.toString('base64'), mime_type: mime };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const describePet = (pet) =>
  [
    `Loại tin: ${pet.type === 'lost' ? 'mất' : 'nhặt được'}`,
    `Loài: ${pet.species}`,
    `Giống: ${pet.breed}`,
    `Màu: ${pet.color}`,
    `Khu vực: ${pet.area}`,
    `Ngày: ${new Date(pet.date).toLocaleDateString('vi-VN')}`,
    pet.description ? `Mô tả: ${pet.description}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

const MATCH_SCHEMA = {
  type: 'object',
  properties: {
    matches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer', description: 'Số thứ tự ứng viên đã nêu trong đề bài.' },
          score: { type: 'integer', description: 'Khả năng cùng một con vật, từ 0 đến 100.' },
          reason: { type: 'string', description: 'Một câu tiếng Việt giải thích vì sao khớp hoặc không khớp.' },
        },
        required: ['index', 'score', 'reason'],
      },
    },
  },
  required: ['matches'],
};

exports.match_posts = async (req, res) => {
  const ai = getClient();
  if (!ai) {
    return res.status(503).json({ message: 'AI chưa được cấu hình. Thiếu GEMINI_API_KEY.' });
  }

  // findById với id sai định dạng ném CastError và rơi xuống nhánh 500.
  if (!mongoose.Types.ObjectId.isValid(req.params.petId)) {
    return res.status(404).json({ message: 'Pet not found' });
  }

  try {
    const source = await Pet.findById(req.params.petId);
    if (!source) return res.status(404).json({ message: 'Pet not found' });

    const since = new Date();
    since.setDate(since.getDate() - CANDIDATE_WINDOW_DAYS);

    const candidates = await Pet.find({
      _id: { $ne: source._id },
      type: source.type === 'lost' ? 'found' : 'lost',
      species: source.species,
      resolved: false,
      date: { $gte: since },
    })
      .sort({ date: -1 })
      .limit(MAX_CANDIDATES);

    if (candidates.length === 0) {
      return res.json({ matches: [] });
    }


    const input = [
      {
        type: 'text',
        text: [
          'Bạn giúp một website tìm thú cưng thất lạc ở Việt Nam đối chiếu các tin đăng.',
          'Dưới đây là một tin gốc và một số tin ứng viên ngược loại.',
          'Hãy chấm từng ứng viên theo khả năng đó là CÙNG MỘT con vật với tin gốc.',
          'Căn cứ vào ảnh (nếu có), giống, màu lông, khu vực và mốc thời gian hợp lý.',
          'Khác giống hoặc khác màu rõ rệt thì cho điểm thấp. Giải thích ngắn gọn bằng tiếng Việt.',
          '',
          `TIN GỐC — ${describePet(source)}`,
        ].join('\n'),
      },
    ];
    // Tải song song để không cộng dồn thời gian chờ.
    const [sourcePart, ...candidateParts] = await Promise.all([
      imagePart(source.image),
      ...candidates.map((c) => imagePart(c.image)),
    ]);
    if (sourcePart) input.push(sourcePart);

    candidates.forEach((c, i) => {
      input.push({ type: 'text', text: `ỨNG VIÊN ${i} — ${describePet(c)}` });
      if (candidateParts[i]) input.push(candidateParts[i]);
    });

    const askGemini = (payload) =>
      withTimeout(
        ai.interactions.create({
          model: MODEL,
          input: payload,
          response_format: { type: 'text', mime_type: 'application/json', schema: MATCH_SCHEMA },
          generation_config: GENERATION_CONFIG,
        }),
        getMatchTimeoutMs()
      );

    let interaction;
    try {
      interaction = await askGemini(input);
    } catch (err) {
      // Hết giờ thì thử lại cũng vô ích, để nhánh catch ngoài xử lý.
      if (err instanceof AiTimeoutError) throw err;
      // Ảnh là thứ hay làm hỏng request nhất (nguồn chặn, định dạng lạ, quá lớn).
      // Thử lại ngay một lần chỉ với mô tả chữ: kém chính xác hơn nhưng vẫn
      // trả được kết quả, thay vì báo lỗi cho người dùng.
      console.warn('AI match: thử lại không kèm ảnh —', err.message);
      interaction = await askGemini(input.filter((part) => part.type !== 'image'));
    }

    let parsed;
    try {
      parsed = JSON.parse(interaction.output_text);
    } catch {
      return res.status(502).json({ message: 'AI không trả về kết quả đọc được' });
    }

    const matches = (parsed.matches || [])
      .filter((m) => candidates[m.index] && m.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .map((m) => ({
        pet: candidates[m.index],
        score: Math.max(0, Math.min(100, m.score)),
        reason: m.reason,
      }));

    res.json({ matches, candidatesChecked: candidates.length });
  } catch (err) {
    if (err instanceof AiTimeoutError) {
      return res.status(504).json({ message: 'AI đang quá tải, thử lại sau ít phút' });
    }
    const status = err.status || (err.response && err.response.status);
    if (status === 429) {
      return res.status(429).json({ message: 'Đã hết lượt miễn phí, thử lại sau một chút' });
    }
    console.error('AI match error:', err.message);
    res.status(500).json({ message: 'Tìm thông tin trùng khớp thất bại' });
  }
};
