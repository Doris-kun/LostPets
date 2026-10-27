const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const crypto = require('crypto');
const Pet = require('../models/petModel');

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

// Tin đăng trước khi có trường imageId chỉ lưu URL. public_id nằm ngay trong URL,
// sau đoạn /upload/ và v<số phiên bản>, nên vẫn moi ra được để dọn.
// Chỉ đúng với URL không kèm biến đổi ảnh — chỗ này chưa bao giờ sinh loại đó.
const publicIdFromUrl = (url) => {
  const match = /\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i.exec(url || '');
  return match ? match[1] : '';
};

// Dọn ảnh không còn ai trỏ tới. Đây là việc phụ, không phải việc chính: thất bại
// thì để lại một file rác trên Cloudinary, còn tin của người dùng vẫn lưu xong.
// Nên không await và không để nó làm request thất bại.
const discardImage = (pet) => {
  const publicId = pet.imageId || publicIdFromUrl(pet.image);
  if (!publicId) return;
  cloudinary.uploader
    .destroy(publicId)
    .catch((err) => console.error('Không xoá được ảnh cũ:', publicId, err && err.message));
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

exports.list_all_pets = async (req, res) => {
  try {
    const filter = {};
    if (req.query.type)    filter.type    = req.query.type;
    if (req.query.species) filter.species = new RegExp(req.query.species, 'i');
    if (req.query.breed)   filter.breed   = new RegExp(req.query.breed,   'i');
    if (req.query.color)   filter.color   = new RegExp(req.query.color,   'i');
    if (req.query.area)    filter.area    = new RegExp(req.query.area,    'i');
    if (req.query.resolved !== undefined) filter.resolved = req.query.resolved === 'true';
    // parseInt('abc') ra NaN, setDate(NaN) ra Invalid Date và MongoDB ném lỗi.
    const days = Number.parseInt(req.query.days, 10);
    if (Number.isFinite(days) && days > 0) {
      const since = new Date();
      since.setDate(since.getDate() - Math.min(days, 3650));
      filter.date = { $gte: since };
    }

    const sort  = req.query.sort === 'oldest' ? { date: 1 } : { date: -1 };
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 9, 1), 50);
    const skip  = Math.max(Number.parseInt(req.query.skip, 10) || 0, 0);

    const [pets, total] = await Promise.all([
      Pet.find(filter).sort(sort).skip(skip).limit(limit),
      Pet.countDocuments(filter),
    ]);

    res.json({ pets, total });
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
