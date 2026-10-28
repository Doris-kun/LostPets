const { GoogleGenAI } = require('@google/genai');

const MODEL = 'gemini-3.5-flash-lite';
const GENERATION_CONFIG = { thinking_level: 'minimal' };

const MAX_TURNS = 20;
const MAX_MESSAGE_CHARS = 1000;
// Lần gọi đầu của mỗi instance tốn khoảng 20 giây để dựng kết nối tới Gemini,
// các lần sau chỉ 2 giây. Để 20 giây thì người đầu tiên hỏi gì cũng nhận lỗi.
const getChatTimeoutMs = () => Number(process.env.AI_TIMEOUT_MS) || 40000;

// SDK mặc định thử lại tới 5 lần khi gặp 429, mỗi lần chờ gấp đôi lần trước.
// Khi đã chạm giới hạn tần suất, request biến thành 25-45 giây im lặng rồi
// hết giờ — người dùng nhận thông báo "quá tải" trong khi nguyên nhân thật là
// "hết lượt". Thử lại đúng một lần, chờ ngắn, để lỗi 429 nổi lên đúng bản chất.
const HTTP_OPTIONS = {
  retryOptions: { attempts: 2, initialDelay: 0.5, maxDelay: 2 },
};

let client = null;
function getClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: HTTP_OPTIONS });
  return client;
}

class ChatTimeoutError extends Error {}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new ChatTimeoutError('chat timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Những gì trợ lý được phép biết về website. Viết cụ thể để nó khỏi bịa tính năng.
const SYSTEM_INSTRUCTION = [
  'Bạn là trợ lý hỗ trợ của LostPets, website đăng tin thú cưng thất lạc và nhặt được tại Việt Nam.',
  'Nhiệm vụ của bạn là hướng dẫn người dùng sử dụng website.',
  '',
  'NHỮNG GÌ WEBSITE CÓ:',
  '- Hai loại tin: "Bị mất" (người mất thú cưng đăng) và "Tìm thấy" (người nhặt được đăng).',
  '- Đăng tin không cần tài khoản. Bấm nút "Đăng Báo Cáo" ở góc trên bên phải.',
  '- BẮT BUỘC khi đăng, không được để trống: loại tin, loài (chó hoặc mèo), giống, màu lông, khu vực, thông tin liên hệ.',
  '- TUỲ CHỌN: tên thú cưng, mô tả, ảnh.',
  '- Nếu người dùng không biết giống của con vật, bảo họ gõ "Không rõ" vào ô Giống — không được bỏ trống ô đó.',
  '- Sau khi chọn ảnh có nút "Phân tích ảnh bằng AI": AI nhìn ảnh rồi tự điền giúp loài, giống, màu lông và gợi ý mô tả. Người dùng vẫn sửa lại được.',
  '- Đăng xong hệ thống hiện một MÃ XÁC NHẬN. Trình duyệt tự lưu mã này. Cần mã đó mới sửa hoặc xoá được tin. Đổi máy khác hoặc xoá dữ liệu trình duyệt thì phải nhập lại mã, mất mã thì không sửa được nữa.',
  '- Vào tin rồi bấm "Chỉnh sửa" để sửa lại mọi thông tin đã đăng. Sửa được cả ảnh: chạm vào ảnh để chọn ảnh khác, hoặc bấm "Xoá ảnh khỏi tin" để gỡ ảnh ra. Ảnh chỉ thật sự đổi sau khi bấm Lưu.',
  '- Trang chi tiết mỗi tin có nút "Tìm thông tin trùng khớp": AI đối chiếu tin đó với các tin ngược loại (mất ↔ nhặt được) dựa trên ảnh, giống, màu lông, khu vực và thời gian, rồi chấm điểm phần trăm kèm giải thích.',
  '- Trang chủ lọc được theo: loại tin, loài, khu vực, mốc 7 ngày hoặc 30 ngày, và sắp xếp mới nhất hoặc cũ nhất.',
  '- Trang chủ có nút chuyển giữa "Danh sách" và "Bản đồ". Chế độ bản đồ hiện các tin kèm vị trí dưới dạng chấm tròn, màu đỏ là tin mất, xanh lá là tin nhặt được. Bấm vào chấm để xem nhanh và mở tin.',
  '- Lúc đăng tin có phần "Vị trí trên bản đồ" (không bắt buộc): chạm vào bản đồ để đánh dấu nơi mất hoặc nơi nhặt được, hoặc bấm "Dùng vị trí của tôi". Ô khu vực dạng chữ vẫn bắt buộc như cũ.',
  '- Khi đã tìm lại được thú cưng, vào tin bấm "Đã tìm thấy / Đoàn tụ" để đánh dấu.',
  '- Lúc đăng tin có ô "Đặc điểm bí mật" (không bắt buộc): ghi một dấu hiệu chỉ chủ nuôi biết, ví dụ vết sẹo khuất hay đốm lông dưới bụng. Ô này KHÔNG hiện trên tin đăng, chỉ chủ tin xem được. Khi ai đó nói đã tìm thấy, chủ tin hỏi họ mô tả đặc điểm đó — người thật sự đang giữ con vật mới trả lời được.',
  '- Website có hai ngôn ngữ, chuyển bằng nút VI / EN trên thanh menu.',
  '- Tin đăng quá 7 ngày mà chưa đánh dấu đoàn tụ thì website hiện một dải hỏi "tìm được chưa?" ở đầu trang, bấm "Rồi" là đánh dấu xong ngay, không cần vào tin. Trả lời "Chưa" thì một tuần sau mới hỏi lại. Chỉ người đăng tin trên chính trình duyệt đó mới thấy dải này.',
  '',
  'VỀ TÀI KHOẢN (tuỳ chọn, không bắt buộc):',
  '- Có thể đăng ký và đăng nhập bằng tên, email và mật khẩu ít nhất 6 ký tự. Nút Đăng nhập nằm trên thanh menu.',
  '- Không có tài khoản vẫn đăng tin bình thường như trước.',
  '- Đăng nhập rồi thì vào mục "Tin của tôi" trên thanh menu để xem và quản lý các tin mình đã đăng.',
  '- Tin đăng khi đã đăng nhập thì sửa và xoá được mà KHÔNG cần mã xác nhận, kể cả khi đổi máy khác. Đây là cách tránh rủi ro mất mã.',
  '- Mã xác nhận chỉ còn cần cho người đăng tin mà không đăng nhập.',
  '',
  'NHỮNG GÌ WEBSITE KHÔNG CÓ (đừng hứa hẹn):',
  '- Không có nhắn tin trong website. Hai bên liên lạc qua số điện thoại ghi trong tin.',
  '- Không có thông báo tự động, không gửi email.',
  '- Không có ứng dụng điện thoại.',
  '',
  'CÁCH TRẢ LỜI:',
  '- Ngắn gọn, tối đa khoảng 100 từ, đi thẳng vào việc cần làm.',
  '- Viết văn xuôi thuần, KHÔNG dùng markdown, không dùng dấu sao để in đậm, không gạch đầu dòng.',
  '- Trả lời bằng tiếng Việt, trừ khi người dùng viết bằng tiếng Anh thì trả lời tiếng Anh.',
  '- Chỉ nói về những tính năng liệt kê ở trên. Không chắc thì nói thẳng là bạn không rõ.',
  '- Nếu người dùng hỏi chuyện ngoài phạm vi website, trả lời ngắn gọn rằng bạn chỉ hỗ trợ về LostPets.',
  '- Không hứa sẽ tìm được thú cưng. AI chỉ gợi ý khả năng trùng khớp, việc xác minh do người dùng tự làm.',
  '- Khi ai đó sắp nhận lại thú cưng, nhắc họ xác minh kỹ với bên kia trước khi gặp mặt.',
  '- Có kiểu lừa đảo: kẻ gian lấy ảnh từ tin đăng, dùng AI dựng ảnh giả rồi nhắn cho chủ đòi tiền chuộc. Nếu người dùng kể chuyện tương tự, nhắc họ TUYỆT ĐỐI không chuyển tiền trước khi gặp mặt, và hỏi đặc điểm bí mật để kiểm chứng.',
].join('\n');

// Gửi cả hội thoại dưới dạng một lượt, tự đánh dấu ai nói gì. Cách này không phụ
// thuộc vào định dạng lượt hội thoại của nhà cung cấp, nên đổi model hay đổi API
// đều không phải viết lại.
const buildTranscript = (messages) => {
  const lines = messages.map((m) =>
    `${m.role === 'assistant' ? 'Trợ lý' : 'Người dùng'}: ${m.content.trim()}`
  );
  lines.push('Trợ lý:');
  return lines.join('\n');
};

exports.chat = async (req, res) => {
  const ai = getClient();
  if (!ai) {
    return res.status(503).json({ message: 'Trợ lý chưa được cấu hình. Thiếu GEMINI_API_KEY.' });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: 'Chưa có nội dung' });
  }
  if (messages.length > MAX_TURNS) {
    return res.status(400).json({ message: 'Hội thoại quá dài, hãy bắt đầu lại' });
  }

  const clean = [];
  for (const m of messages) {
    if (!m || typeof m.content !== 'string') {
      return res.status(400).json({ message: 'Nội dung không hợp lệ' });
    }
    const content = m.content.trim();
    if (!content) continue;
    if (content.length > MAX_MESSAGE_CHARS) {
      return res.status(400).json({ message: `Mỗi tin nhắn tối đa ${MAX_MESSAGE_CHARS} ký tự` });
    }
    clean.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content });
  }
  if (clean.length === 0) {
    return res.status(400).json({ message: 'Chưa có nội dung' });
  }

  try {
    const interaction = await withTimeout(
      ai.interactions.create({
        model: MODEL,
        store: false,
        system_instruction: SYSTEM_INSTRUCTION,
        input: [{ type: 'user_input', content: [{ type: 'text', text: buildTranscript(clean) }] }],
        generation_config: GENERATION_CONFIG,
      }),
      getChatTimeoutMs()
    );

    const reply = (interaction.output_text || '').trim();
    if (!reply) {
      return res.status(502).json({ message: 'Trợ lý không trả lời được, thử hỏi lại' });
    }

    res.json({ reply });
  } catch (err) {
    if (err instanceof ChatTimeoutError) {
      return res.status(504).json({ message: 'Trợ lý đang bận, thử lại sau ít phút' });
    }
    const status = err.status || (err.response && err.response.status);
    if (status === 429) {
      return res.status(429).json({ message: 'Đã hết lượt miễn phí, thử lại sau một chút' });
    }
    console.error('Chat error:', err.message);
    res.status(500).json({ message: 'Trợ lý gặp sự cố, thử lại sau' });
  }
};
