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
