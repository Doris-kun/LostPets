const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const crypto = require('crypto');
const Pet = require('../models/petModel');

// Mã xác nhận: người đăng nhận một lần lúc tạo tin, cần nó để sửa hoặc xoá.
// Database chỉ lưu bản băm, mất mã thì không ai khôi phục được.
const generateClaimCode = () => crypto.randomBytes(5).toString('hex').toUpperCase();
const hashClaimCode = (code) => crypto.createHash('sha256').update(code).digest('hex');

// Tin cũ chưa có claimHash thì vẫn cho sửa/xoá, để dữ liệu đăng trước đây không bị khoá.
async function assertMayModify(req, res) {
  const pet = await Pet.findById(req.params.petId).select('+claimHash');
  if (!pet) {
    res.status(404).json({ message: 'Pet not found' });
    return null;
  }
  if (!pet.claimHash) return pet;

  const provided = req.get('x-claim-code') || (req.body && req.body.claimCode);
  if (!provided || hashClaimCode(String(provided).trim().toUpperCase()) !== pet.claimHash) {
    res.status(403).json({ message: 'Sai mã xác nhận' });
    return null;
  }
  return pet;
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.upload = multer({ storage: multer.memoryStorage() }).single('image');

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
    if (req.query.days) {
      const since = new Date();
      since.setDate(since.getDate() - parseInt(req.query.days));
      filter.date = { $gte: since };
    }

    const sort  = req.query.sort === 'oldest' ? { date: 1 } : { date: -1 };
    const limit = Math.min(parseInt(req.query.limit) || 9, 50);
    const skip  = parseInt(req.query.skip) || 0;

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
    const { type, name, species, breed, color, area, contact, description } = req.body;
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
      image: imageUrl, claimHash: hashClaimCode(claimCode),
    });
    // claimCode chỉ xuất hiện đúng lần này, không có endpoint nào đọc lại được.
    // select: false chỉ lọc ở truy vấn, tài liệu vừa tạo vẫn giữ claimHash nên phải bỏ tay.
    const { claimHash: _omit, ...created } = pet.toObject();
    res.status(201).json({ ...created, claimCode });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.read_a_pet = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.petId);
    if (!pet) return res.status(404).json({ message: 'Pet not found' });
    res.json(pet);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.update_a_pet = async (req, res) => {
  try {
    if (!(await assertMayModify(req, res))) return;

    // claimCode có thể nằm trong body, đừng để nó ghi đè lên tài liệu.
    const { claimCode, claimHash, ...updates } = req.body || {};
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
