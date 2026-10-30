const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const crypto = require('crypto');
const Pet = require('../models/petModel');
const { discardImage } = require('../lib/images');
const { textForPet, embedDocument, embedQuery, cosine } = require('../lib/embedding');

// Những trường mà sửa đi thì vector cũ không còn đúng nữa. contact và
// secretDetail không có trong đây vì chúng không được nhúng ngay từ đầu.
const EMBEDDED_FIELDS = ['type', 'name', 'species', 'breed', 'color', 'area', 'description'];

// Nhúng lại tin, chạy ngầm. Cố ý KHÔNG await ở chỗ gọi: nhúng mất vài trăm ms
// và cần mạng ra Gemini, bắt người đăng tin ngồi chờ thì vô lý — họ đang vội
// tìm con vật của mình. Hỏng thì tin vẫn nằm đó, chỉ là chưa tìm theo nghĩa
// được, chạy scripts/backfill-embeddings.js là bù lại.
const refreshEmbedding = (pet) => {
  if (!pet) return;
  embedDocument(textForPet(pet))
    .then((vector) => {
      if (!vector) return;
      return Pet.updateOne({ _id: pet._id }, { $set: { embedding: vector } });
    })
    .catch((err) => console.error('Không cập nhật được vector:', err && err.message));
};

// Mã xác nhận: người đăng nhận một lần lúc tạo tin, cần nó để sửa hoặc xoá.
// Database chỉ lưu bản băm, mất mã thì không ai khôi phục được.
// Chỉ những trường này được sửa qua API. Danh sách trắng chứ không phải danh
// sách đen: thêm trường mới vào model sau này cũng không vô tình cho sửa.
// owner, claimHash, postId và date cố tình nằm ngoài — cho sửa thì ai sửa được
// tin cũng chiếm được quyền sở hữu, khoá tin lại, hoặc đẩy tin lên đầu danh sách.
//
// image và imageId cố tình nằm ngoài: ảnh chỉ đổi được bằng cách tải file lên,
// chứ không bằng cách gửi một chuỗi URL. Cho gửi URL thì ai sửa được tin cũng
// trỏ ảnh đi bất kỳ đâu — sang ảnh nhục mạ, hoặc sang một server đếm xem có bao
// nhiêu người xem tin đó.
const EDITABLE_FIELDS = [
  'type', 'name', 'species', 'breed', 'color', 'area', 'contact', 'description', 'resolved',
  'secretDetail', 'lat', 'lng',
];

// Gửi qua form thì boolean biến thành chuỗi, mà Boolean('false') lại ra true.
// Cần biết giá trị thật trước khi Mongoose ép kiểu, để quyết định có đóng dấu
// resolvedAt hay không.
const isTruthy = (v) => v === true || v === 'true' || v === 1 || v === '1';

// Chỉ nhận toạ độ khi có đủ cả hai và nằm trong khoảng hợp lệ.
function isValidCoord(lat, lng) {
  if (lat === undefined && lng === undefined) return true;
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  );
}

const pickEditable = (body = {}) => {
  const picked = Object.fromEntries(
    Object.entries(body).filter(([key]) => EDITABLE_FIELDS.includes(key))
  );
  // Toạ độ đi qua form nên luôn là chuỗi.
  // Cẩn thận: Number(null) ra 0, không xử lý riêng thì "xoá vị trí" lại thành
  // toạ độ 0,0 giữa Đại Tây Dương.
  let cleared = false;
  for (const key of ['lat', 'lng']) {
    if (!(key in picked)) continue;
    const raw = picked[key];
    if (raw === null || raw === '' || raw === 'null') {
      cleared = true;
      continue;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) delete picked[key];
    else picked[key] = n;
  }

  if (cleared) {
    // Xoá một trong hai thì xoá cả cặp, không để lại toạ độ nửa vời.
    picked.lat = null;
    picked.lng = null;
  } else if (!isValidCoord(picked.lat, picked.lng)) {
    delete picked.lat;
    delete picked.lng;
  }
  return picked;
};

const generateClaimCode = () => crypto.randomBytes(5).toString('hex').toUpperCase();
const hashClaimCode = (code) => crypto.createHash('sha256').update(code).digest('hex');

// Ai được sửa hoặc xoá một tin:
//   1. chủ tài khoản đã đăng tin đó — không cần mã, đổi máy vẫn sửa được;
//   2. người cầm mã xác nhận — dành cho khách vãng lai;
//   3. tin cũ chưa có cả hai thứ trên thì vẫn mở, để dữ liệu đăng trước đây không bị khoá.
async function assertMayModify(req, res) {
  // +imageId để chỗ gọi còn biết ảnh cũ nằm ở public_id nào mà dọn.
  const pet = await Pet.findById(req.params.petId).select('+claimHash +imageId');
  if (!pet) {
    res.status(404).json({ message: 'Pet not found' });
    return null;
  }

  if (pet.owner && req.user && String(pet.owner) === req.user.sub) return pet;

  if (!pet.claimHash) {
    // Tin có chủ nhưng người gọi không phải chủ: không cho dựa vào kẽ hở này.
    if (pet.owner) {
      res.status(403).json({ message: 'Tin này thuộc về tài khoản khác' });
      return null;
    }
    return pet;
  }

  const provided = req.get('x-claim-code') || (req.body && req.body.claimCode);
  if (!provided || hashClaimCode(String(provided).trim().toUpperCase()) !== pet.claimHash) {
    res.status(403).json({ message: 'Sai mã xác nhận' });
    return null;
  }
  return pet;
}

// Danh sách tin của chính người đang đăng nhập.
exports.list_my_pets = async (req, res) => {
  try {
    const pets = await Pet.find({ owner: req.user.sub }).sort({ date: -1 });
    res.json({ pets, total: pets.length });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Lỗi riêng cho bước tải ảnh lên, để phân biệt với lỗi database ở cùng khối try.
// Ảnh không lên được là chuyện của Cloudinary, nói đúng thì người dùng còn biết
// là thử lại được; gộp vào "Server error" thì họ tưởng tin của mình mất rồi.
class ImageUploadError extends Error {}

const uploadImage = async (buffer) => {
  try {
    return await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: 'lost-pets' }, (err, data) => {
          if (err) reject(err); else resolve(data);
        })
        .end(buffer);
    });
  } catch (err) {
    throw new ImageUploadError(err && err.message);
  }
};

// memoryStorage giữ nguyên file trong RAM, không giới hạn thì một file lớn
// đủ làm sập instance free tier.
exports.upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'image'));
  },
}).single('image');

const generatePostId = (type) => {
  const prefix = type === 'lost' ? 'L' : 'F';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const random = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${prefix}-${random}`;
};

const MAX_QUERY_CHARS = 200;
// Tìm kiếm xếp hạng trong bộ nhớ nên phải đọc vector của mọi tin khớp bộ lọc.
// 768 số mỗi tin là khoảng 6KB, nên 500 tin là 3MB mỗi lượt tìm — chấp nhận
// được ở quy mô này. Vượt ngưỡng thì phải chuyển sang Atlas Vector Search.
const SEARCH_POOL = 500;

// Xếp hạng theo nghĩa, trong phần đã bị bộ lọc cứng chặn lại.
//
// Vector chỉ được quyền SẮP THỨ TỰ, không được quyền LOẠI BỎ. Đo thật trên
// tiếng Việt cho thấy không có ngưỡng điểm nào dùng được: câu rác "xe máy
// Honda Wave bị mất" đạt 0.646 trong khi câu tra số điện thoại thật chỉ 0.639.
// Cắt theo ngưỡng là vừa giấu nhầm tin thật vừa không chặn nổi tin rác.
//
// Mà với web tìm thú cưng thì bỏ sót nguy hiểm hơn thừa: thấy nhầm một con chó
// hơi giống thì mất hai giây, giấu mất con chó của người ta thì mất luôn.
async function searchByMeaning(q, filter) {
  const docs = await Pet.find(filter).select('+embedding').limit(SEARCH_POOL).lean();
  const vector = await embedQuery(q);
  const needle = q.toLowerCase();

  const scored = docs.map((doc) => {
    const { embedding, ...pet } = doc;
    return {
      pet,
      // Khớp nguyên văn thì luôn đứng trên, bất kể điểm ngữ nghĩa. Dành cho
      // người gõ thẳng mã tin, số điện thoại hay tên riêng — những thứ phải
      // chắc chắn ra đúng tin đó chứ không phải "khả năng cao là đúng".
      exact: textForPet(doc).toLowerCase().includes(needle),
      score: vector ? cosine(vector, embedding) : 0,
    };
  });

  // Nhúng hỏng (mất key, hết quota) thì lui về lọc theo chữ, còn hơn trả về
  // một danh sách xếp bừa rồi người dùng tưởng là kết quả tìm kiếm.
  const usable = vector ? scored : scored.filter((row) => row.exact);

  usable.sort((a, b) => (b.exact - a.exact) || (b.score - a.score));
  return usable.map((row) => row.pet);
}

// Bộ lọc cứng, dùng chung cho danh sách và bản đồ. Hai chỗ phải lọc giống hệt
// nhau, nếu không thì bấm qua lại giữa "Danh sách" và "Bản đồ" sẽ ra hai tập
// tin khác nhau mà không ai hiểu vì sao.
const buildFilter = (query = {}) => {
  const filter = {};
  if (query.type)    filter.type    = query.type;
  if (query.species) filter.species = new RegExp(query.species, 'i');
  if (query.breed)   filter.breed   = new RegExp(query.breed,   'i');
  if (query.color)   filter.color   = new RegExp(query.color,   'i');
  if (query.area)    filter.area    = new RegExp(query.area,    'i');
  if (query.resolved !== undefined) filter.resolved = query.resolved === 'true';
  // parseInt('abc') ra NaN, setDate(NaN) ra Invalid Date và MongoDB ném lỗi.
  const days = Number.parseInt(query.days, 10);
  if (Number.isFinite(days) && days > 0) {
    const since = new Date();
    since.setDate(since.getDate() - Math.min(days, 3650));
    filter.date = { $gte: since };
  }
  return filter;
};

exports.list_all_pets = async (req, res) => {
  try {
    const filter = buildFilter(req.query);

    const sort  = req.query.sort === 'oldest' ? { date: 1 } : { date: -1 };
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 9, 1), 50);
    const skip  = Math.max(Number.parseInt(req.query.skip, 10) || 0, 0);

    const q = String(req.query.q || '').trim().slice(0, MAX_QUERY_CHARS);
    if (q) {
      const ranked = await searchByMeaning(q, filter);
      return res.json({ pets: ranked.slice(skip, skip + limit), total: ranked.length });
    }

    const [pets, total] = await Promise.all([
      Pet.find(filter).sort(sort).skip(skip).limit(limit),
      Pet.countDocuments(filter),
    ]);

    res.json({ pets, total });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// Bản đồ cần MỌI tin khớp bộ lọc cùng lúc, không phân trang — không thể vẽ
// nửa bản đồ rồi bắt người dùng bấm "xem thêm". Nhưng cũng không thể trả về
// vô hạn, nên chặn ở 500 và nói thẳng ra là đã bị chặn thay vì âm thầm giấu.
const MAP_POOL = 500;

// Chỉ những trường bản đồ thật sự vẽ ra. Tin đăng có mô tả dài, trả nguyên 500
// tin đầy đủ là vài MB cho một màn hình chỉ hiện chấm tròn và popup nhỏ.
const MAP_FIELDS = '_id postId type name breed color area image lat lng resolved';

const hasCoords = (pet) => Number.isFinite(pet.lat) && Number.isFinite(pet.lng);

exports.list_pets_for_map = async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    // Tin không ghim vị trí thì không vẽ lên bản đồ được. Lọc ngay ở database
    // chứ không tải về rồi mới bỏ đi.
    const located = { ...filter, lat: { $ne: null }, lng: { $ne: null } };

    const q = String(req.query.q || '').trim().slice(0, MAX_QUERY_CHARS);
    if (q) {
      // Dùng chung ô tìm kiếm với danh sách, nếu không thì gõ chữ rồi bấm sang
      // bản đồ sẽ thấy cả những tin vừa bị loại. Thứ hạng bỏ đi: trên bản đồ
      // mọi chấm đều hiện cùng lúc nên không có khái niệm "đứng trên".
      // Tìm trên toàn bộ bộ lọc rồi mới tách, để còn đếm được bao nhiêu tin
      // khớp nhưng không vẽ lên được vì thiếu toạ độ.
      const ranked = await searchByMeaning(q, filter);
      const onMap = ranked.filter(hasCoords);
      return res.json({
        pets: onMap.slice(0, MAP_POOL),
        total: onMap.length,
        withoutCoords: ranked.length - onMap.length,
        capped: onMap.length > MAP_POOL,
      });
    }

    const [pets, total, matching] = await Promise.all([
      Pet.find(located).sort({ date: -1 }).limit(MAP_POOL).select(MAP_FIELDS).lean(),
      Pet.countDocuments(located),
      Pet.countDocuments(filter),
    ]);

    res.json({ pets, total, withoutCoords: matching - total, capped: total > MAP_POOL });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.create_a_pet = async (req, res) => {
  try {
    const { type, name, species, breed, color, area, contact, description, secretDetail } = req.body;
    const coords = pickEditable({ lat: req.body.lat, lng: req.body.lng });
    if (!type || !species || !breed || !color || !area || !contact) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    let imageUrl = '';
    let imageId = '';
    if (req.file) {
      const result = await uploadImage(req.file.buffer);
      imageUrl = result.secure_url;
      imageId = result.public_id;
    }

    const postId = generatePostId(type);
    const claimCode = generateClaimCode();
    const pet = await Pet.create({
      postId, type, name, species, breed, color, area, contact, description,
      secretDetail: secretDetail || '',
      lat: coords.lat === undefined ? null : coords.lat,
      lng: coords.lng === undefined ? null : coords.lng,
      image: imageUrl, imageId, claimHash: hashClaimCode(claimCode),
      // Đăng khi đã đăng nhập thì tin gắn luôn vào tài khoản.
      owner: req.user ? req.user.sub : null,
    });
    refreshEmbedding(pet);
    // claimCode chỉ xuất hiện đúng lần này, không có endpoint nào đọc lại được.
    // select: false chỉ lọc ở truy vấn, tài liệu vừa tạo vẫn giữ claimHash nên phải bỏ tay.
    const { claimHash: _h, secretDetail: _s, imageId: _i, ...created } = pet.toObject();
    res.status(201).json({ ...created, claimCode });
  } catch (err) {
    if (err instanceof ImageUploadError) {
      return res.status(502).json({ message: 'Không tải được ảnh lên, thử lại sau' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.read_a_pet = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.petId).select('+secretDetail +claimHash');
    if (!pet) return res.status(404).json({ message: 'Pet not found' });

    const { secretDetail, claimHash, ...publicPet } = pet.toObject();

    // Đặc điểm bí mật chỉ trả về cho chủ tin: người đăng nhập đúng tài khoản,
    // hoặc người cầm mã xác nhận. Khách xem tin không bao giờ thấy.
    const isOwner = pet.owner && req.user && String(pet.owner) === req.user.sub;
    const provided = req.get('x-claim-code');
    const hasCode =
      claimHash && provided && hashClaimCode(String(provided).trim().toUpperCase()) === claimHash;

    if (isOwner || hasCode) publicPet.secretDetail = secretDetail || '';

    res.json(publicPet);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.update_a_pet = async (req, res) => {
  try {
    const current = await assertMayModify(req, res);
    if (!current) return;

    const updates = pickEditable(req.body);

    // Bấm nút "Đã tìm thấy" là khởi động đồng hồ đếm ngược tới đợt dọn tự động.
    // resolvedAt cố tình nằm ngoài danh sách trắng: client không tự đặt được,
    // nếu không thì ai cũng hoãn hoặc ép xoá tin của mình bằng một dòng body.
    // Chỉ đóng dấu khi trạng thái THẬT SỰ đổi từ chưa sang rồi — sửa lại nội
    // dung một tin đã đoàn tụ không được phép đẩy hạn xoá lùi thêm 30 ngày nữa.
    if ('resolved' in updates) {
      const nowResolved = isTruthy(updates.resolved);
      updates.resolved = nowResolved;
      if (nowResolved && !current.resolved) updates.resolvedAt = new Date();
      else if (!nowResolved) updates.resolvedAt = null;
    }

    // Ảnh không đi qua danh sách trắng: hoặc có file mới tải lên, hoặc người
    // dùng bấm xoá ảnh. Gán thẳng vào updates sau khi đã lọc body, nên dù client
    // có gửi image hay imageId trong body thì cũng không ăn.
    // Qua form nên removeImage là chuỗi; gửi JSON thì là boolean.
    const wantsRemove = req.body.removeImage === true || req.body.removeImage === 'true';
    let replaced = false;

    if (req.file) {
      const result = await uploadImage(req.file.buffer);
      updates.image = result.secure_url;
      updates.imageId = result.public_id;
      replaced = true;
    } else if (wantsRemove && current.image) {
      updates.image = '';
      updates.imageId = '';
      replaced = true;
    }

    const pet = await Pet.findByIdAndUpdate(req.params.petId, updates, {
      new: true,
      runValidators: true,
    });

    // Dọn ảnh cũ chỉ sau khi tin đã lưu xong. Dọn trước mà lưu lỗi thì tin còn
    // trỏ vào một ảnh vừa bị xoá, người xem nhận về ô ảnh hỏng.
    if (replaced) discardImage(current);

    // Chỉ nhúng lại khi nội dung mô tả thật sự đổi. Bấm "Đã tìm thấy" hay đổi
    // số điện thoại không làm vector sai đi, nhúng lại là đốt quota vô ích.
    if (EMBEDDED_FIELDS.some((field) => field in updates)) refreshEmbedding(pet);

    res.json(pet);
  } catch (err) {
    if (err instanceof ImageUploadError) {
      return res.status(502).json({ message: 'Không tải được ảnh lên, thử lại sau' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.delete_a_pet = async (req, res) => {
  try {
    const pet = await assertMayModify(req, res);
    if (!pet) return;

    await Pet.findByIdAndDelete(req.params.petId);
    // Xoá tin mà để ảnh lại thì file đó nằm trên Cloudinary vĩnh viễn, không còn
    // chỗ nào trỏ tới để biết mà dọn.
    discardImage(pet);
    res.json({ message: 'Pet deleted successfully' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
