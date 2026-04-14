const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const AppError = require("../errors/AppError");
const path = require("path");

// ============================================
// CLOUDINARY CONFIG
// ============================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ============================================
// ALLOWED TYPES
// ============================================
const ALLOWED_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
};

// ============================================
// FILE FILTER — validates mimetype + extension
// ============================================
const imageFileFilter = (req, file, cb) => {
  const allowedExts = ALLOWED_TYPES[file.mimetype];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExts && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new AppError("Only image files (JPG, PNG, GIF, WEBP) are allowed!", 400),
      false,
    );
  }
};

// ============================================
// CLOUDINARY STORAGE — images go to 'zentrox/posts'
// ============================================
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "zentrox/posts",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 1280, height: 720, crop: "limit" }], // optional resize
  },
});

// ============================================
// EXPORTS
// ============================================

// single image upload (used for posts)
exports.uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFileFilter,
}).single("image");

// expose cloudinary instance so postController can delete old images
exports.cloudinary = cloudinary;
