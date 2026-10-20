const { GoogleGenAI } = require('@google/genai');
const multer = require('multer');

const MODEL = 'gemini-3.8-flash';
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
    const interaction = await ai.interactions.create({
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
    });

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

const Pet = require('../models/petModel');

const MAX_CANDIDATES = 6;
const CANDIDATE_WINDOW_DAYS = 120;
const MIN_SCORE = 40;
const IMAGE_FETCH_TIMEOUT_MS = 6000;

// Tải ảnh về rồi chuyển sang base64. Ảnh hỏng thì bỏ qua, vẫn so khớp bằng chữ.
async function fetchImageAsBase64(url) {
  if (!url) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const mime = res.headers.get('content-type') || 'image/jpeg';
    if (!SUPPORTED_TYPES.includes(mime.split(';')[0].trim())) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_IMAGE_BYTES) return null;
    return { data: buffer.toString('base64'), mime_type: mime.split(';')[0].trim() };
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

    const sourceImage = await fetchImageAsBase64(source.image);
    const candidateImages = await Promise.all(candidates.map((c) => fetchImageAsBase64(c.image)));

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
    if (sourceImage) input.push({ type: 'image', ...sourceImage });

    candidates.forEach((c, i) => {
      input.push({ type: 'text', text: `ỨNG VIÊN ${i} — ${describePet(c)}` });
      if (candidateImages[i]) input.push({ type: 'image', ...candidateImages[i] });
    });

    const interaction = await ai.interactions.create({
      model: MODEL,
      input,
      response_format: { type: 'text', mime_type: 'application/json', schema: MATCH_SCHEMA },
    });

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
    const status = err.status || (err.response && err.response.status);
    if (status === 429) {
      return res.status(429).json({ message: 'Đã hết lượt miễn phí, thử lại sau một chút' });
    }
    console.error('AI match error:', err.message);
    res.status(500).json({ message: 'Tìm tin khớp thất bại' });
  }
};
