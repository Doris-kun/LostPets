const AnthropicModule = require('@anthropic-ai/sdk');
const multer = require('multer');

const Anthropic = AnthropicModule.default || AnthropicModule;

const MODEL = 'claude-opus-5-5';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Claude nhận ảnh trực tiếp từ bộ nhớ, không cần ghi ra đĩa.
exports.upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
}).single('image');

// Khởi tạo muộn: thiếu API key thì endpoint trả 503 thay vì làm sập cả server lúc start.
let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic();
  return client;
}

const EXTRACT_TOOL = {
  name: 'extract_pet_info',
  description: 'Ghi lại thông tin thú cưng nhận diện được trong ảnh.',
  strict: true,
  input_schema: {
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
    additionalProperties: false,
  },
};

const SYSTEM_PROMPT = [
  'Bạn hỗ trợ một website đăng tin thú cưng thất lạc tại Việt Nam.',
  'Người dùng tải lên ảnh một con vật. Hãy nhìn ảnh và gọi công cụ extract_pet_info để ghi lại những gì bạn thấy.',
  'Luôn gọi công cụ, kể cả khi ảnh không phải chó mèo — khi đó đặt is_pet = false.',
  'Mọi giá trị chữ phải bằng tiếng Việt. Không chắc thì ghi "Không rõ" thay vì đoán bừa.',
].join(' ');

exports.analyze_image = async (req, res) => {
  const anthropic = getClient();
  if (!anthropic) {
    return res.status(503).json({ message: 'AI chưa được cấu hình. Thiếu ANTHROPIC_API_KEY.' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Chưa có ảnh để phân tích' });
  }

  if (!SUPPORTED_TYPES.includes(req.file.mimetype)) {
    return res.status(400).json({ message: 'Chỉ hỗ trợ ảnh JPEG, PNG, GIF hoặc WEBP' });
  }

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      // Phân loại ảnh là việc đơn giản — effort thấp cho nhanh và rẻ.
      output_config: { effort: 'low' },
      system: SYSTEM_PROMPT,
      tools: [EXTRACT_TOOL],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: req.file.mimetype,
                data: req.file.buffer.toString('base64'),
              },
            },
            { type: 'text', text: 'Đây là con vật trong tin đăng. Hãy gọi extract_pet_info.' },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return res.status(422).json({ message: 'Không phân tích được ảnh này' });
    }

    const toolUse = response.content.find(
      (block) => block.type === 'tool_use' && block.name === 'extract_pet_info'
    );
    if (!toolUse) {
      return res.status(502).json({ message: 'AI không trả về kết quả đọc được' });
    }

    const result = toolUse.input;
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
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(503).json({ message: 'API key không hợp lệ' });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ message: 'Đang quá tải, thử lại sau một chút' });
    }
    console.error('AI analyze error:', err.message);
    res.status(500).json({ message: 'Phân tích ảnh thất bại' });
  }
};
