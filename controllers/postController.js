const AppError = require("../errors/AppError");
const Post = require("../models/postModel");
const catchAsync = require("../utils/catchAsync");
const { IdChecker } = require("../utils/IdChecker");
const { cloudinary } = require("../middleware/upload");

// ============================================
// HELPER — extract Cloudinary public_id from URL
// so we can delete old images when post is updated
// ============================================
const getPublicId = (imageUrl) => {
  // URL format: https://res.cloudinary.com/cloud/image/upload/v123/zentrox/posts/filename
  // public_id  = zentrox/posts/filename (no extension)
  try {
    const parts = imageUrl.split("/upload/");
    const withVersion = parts[1]; // e.g. v1234567/zentrox/posts/abc123
    const withoutVersion = withVersion.replace(/^v\d+\//, ""); // zentrox/posts/abc123
    return withoutVersion.replace(/\.[^/.]+$/, ""); // remove extension
  } catch {
    return null;
  }
};

// ============================================
// CREATE POST
// ============================================
exports.createPost = catchAsync(async (req, res, next) => {
  const { _id } = req.user;
  const { title, description } = req.body;

  // check image was uploaded to Cloudinary
  if (!req.file)
    return next(new AppError("Please upload an image for the post", 400));

  if (!title || !description)
    return next(new AppError("Title and description are required", 400));

  // Cloudinary gives us req.file.path as the hosted URL
  // and req.file.filename as the public_id
  const imageUrl = req.file.path;

  // check title uniqueness
  const exists = await Post.findOne({ title });
  if (exists) {
    // delete the just-uploaded image since we're rejecting the post
    await cloudinary.uploader.destroy(req.file.filename);
    return next(new AppError("Title already exists", 400));
  }

  await Post.create({
    title,
    imageUrl,
    description,
    owner: _id,
  });

  return res.status(201).json({
    status: "success",
    message: "Post created successfully",
    data: { imageUrl },
  });
});

// ============================================
// UPDATE POST
// ============================================
exports.updatePost = catchAsync(async (req, res, next) => {
  const pid = req.params.pid;

  const post = await Post.findById(pid);
  if (!post) return next(new AppError("Post doesn't exist", 404));

  const result = IdChecker(req.user._id, post.owner);
  if (!result)
    return next(
      new AppError("You don't have permission to update this post", 403),
    );

  // filter only allowed text fields
  const allowedFields = ["title", "description"];
  const filteredBody = Object.keys(req.body)
    .filter((key) => allowedFields.includes(key))
    .reduce((obj, key) => {
      obj[key] = req.body[key];
      return obj;
    }, {});

  // if new image was uploaded → use new Cloudinary URL + delete old image
  if (req.file) {
    // delete old image from Cloudinary
    if (post.imageUrl) {
      const oldPublicId = getPublicId(post.imageUrl);
      if (oldPublicId) {
        await cloudinary.uploader.destroy(oldPublicId);
      }
    }
    filteredBody.imageUrl = req.file.path; // new Cloudinary URL
  }

  if (Object.keys(filteredBody).length === 0)
    return next(new AppError("No valid fields to update", 400));

  // check title uniqueness
  if (filteredBody.title) {
    const exists = await Post.findOne({
      title: filteredBody.title,
      _id: { $ne: pid },
    });
    if (exists) return next(new AppError("Title already in use", 400));
  }

  const updatedPost = await Post.findByIdAndUpdate(pid, filteredBody, {
    returnDocument: "after",
    runValidators: true,
  });

  return res.status(200).json({
    status: "success",
    message: "Post updated successfully!",
    data: { post: updatedPost },
  });
});
