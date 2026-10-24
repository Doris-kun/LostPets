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
const EDITABLE_FIELDS = [
  'type', 'name', 'species', 'breed', 'color', 'area', 'contact', 'description', 'image', 'resolved',
  'secretDetail',
];

const pickEditable = (body = {}) =>
  Object.fromEntries(Object.entries(body).filter(([key]) => EDITABLE_FIELDS.includes(key)));

const generateClaimCode = () => crypto.randomBytes(5).toString('hex').toUpperCase();
const hashClaimCode = (code) => crypto.createHash('sha256').update(code).digest('hex');

// Ai được sửa hoặc xoá một tin:
//   1. chủ tài khoản đã đăng tin đó — không cần mã, đổi máy vẫn sửa được;
//   2. người cầm mã xác nhận — dành cho khách vãng lai;
//   3. tin cũ chưa có cả hai thứ trên thì vẫn mở, để dữ liệu đăng trước đây không bị khoá.
async function assertMayModify(req, res) {
  const pet = await Pet.findById(req.params.petId).select('+claimHash');
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
    if (!type || !species || !breed || !color || !area || !contact) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    let imageUrl = '';
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: 'lost-pets' }, (err, data) => {
            if (err) reject(err); else resolve(data);
          })
          .end(req.file.buffer);
      });
      imageUrl = result.secure_url;
    }

    const postId = generatePostId(type);
    const claimCode = generateClaimCode();
    const pet = await Pet.create({
      postId, type, name, species, breed, color, area, contact, description,
      secretDetail: secretDetail || '',
      image: imageUrl, claimHash: hashClaimCode(claimCode),
      // Đăng khi đã đăng nhập thì tin gắn luôn vào tài khoản.
      owner: req.user ? req.user.sub : null,
    });
    // claimCode chỉ xuất hiện đúng lần này, không có endpoint nào đọc lại được.
    // select: false chỉ lọc ở truy vấn, tài liệu vừa tạo vẫn giữ claimHash nên phải bỏ tay.
    const { claimHash: _h, secretDetail: _s, ...created } = pet.toObject();
    res.status(201).json({ ...created, claimCode });
  } catch {
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
    if (!(await assertMayModify(req, res))) return;

    const updates = pickEditable(req.body);
    const pet = await Pet.findByIdAndUpdate(req.params.petId, updates, {
      new: true,
      runValidators: true,
    });
    res.json(pet);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.delete_a_pet = async (req, res) => {
  try {
    if (!(await assertMayModify(req, res))) return;

    await Pet.findByIdAndDelete(req.params.petId);
    res.json({ message: 'Pet deleted successfully' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
