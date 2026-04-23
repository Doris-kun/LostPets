const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const Pet = require('../models/petModel');

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
    const pet = await Pet.create({ postId, type, name, species, breed, color, area, contact, description, image: imageUrl });
    res.status(201).json(pet);
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
    const pet = await Pet.findByIdAndUpdate(req.params.petId, req.body, { new: true, runValidators: true });
    if (!pet) return res.status(404).json({ message: 'Pet not found' });
    res.json(pet);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.delete_a_pet = async (req, res) => {
  try {
    const pet = await Pet.findByIdAndDelete(req.params.petId);
    if (!pet) return res.status(404).json({ message: 'Pet not found' });
    res.json({ message: 'Pet deleted successfully' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
