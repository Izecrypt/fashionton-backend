/**
 * FashionTON Wardrobe - Cloudinary Image Upload Handler
 * Handles image uploads, transformations, and moderation
 */

const { v2: cloudinary } = require('cloudinary');
const crypto = require('crypto');

// Configure Cloudinary
function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

/**
 * Generate signed upload parameters for client-side upload
 * @param {Object} options - Upload options
 * @returns {Object} - Upload parameters including signature
 */
function generateUploadSignature(options = {}) {
  configureCloudinary();

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = options.folder || 'fashionton/wardrobe';
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'fashionton_uploads';

  // Parameters for signed upload
  const paramsToSign = {
    timestamp,
    folder,
    upload_preset: uploadPreset,
    moderation: 'aws_rek', // Enable AWS Rekognition moderation
    ...(options.userId && { tags: `user_${options.userId}` })
  };

  // Generate signature
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  );

  return {
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
    uploadPreset,
    moderation: 'aws_rek'
  };
}

/**
 * Upload image from base64 data (server-side)
 * @param {string} base64Data - Base64 encoded image
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Upload result
 */
async function uploadImage(base64Data, options = {}) {
  configureCloudinary();

  const {
    folder = 'fashionton/wardrobe',
    userId,
    tags = [],
    transformation = []
  } = options;

  // Ensure base64 data is properly formatted
  const data = base64Data.startsWith('data:') 
    ? base64Data 
    : `data:image/jpeg;base64,${base64Data}`;

  const uploadOptions = {
    folder,
    resource_type: 'image',
    moderation: 'aws_rek',
    transformation: [
      { width: 1200, height: 1200, crop: 'limit' }, // Limit max dimensions
      { quality: 'auto:good' }, // Auto optimize quality
      ...transformation
    ],
    tags: [
      'fashionton',
      ...(userId ? [`user_${userId}`] : []),
      ...tags
    ]
  };

  try {
    const result = await cloudinary.uploader.upload(data, uploadOptions);
    
    return {
      success: true,
      publicId: result.public_id,
      url: result.secure_url,
      thumbnailUrl: generateThumbnailUrl(result.public_id),
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      moderationStatus: result.moderation ? result.moderation[0].status : 'pending'
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
}

/**
 * Generate thumbnail URL from public ID
 * @param {string} publicId - Cloudinary public ID
 * @returns {string} - Thumbnail URL
 */
function generateThumbnailUrl(publicId) {
  configureCloudinary();
  
  return cloudinary.url(publicId, {
    width: 300,
    height: 300,
    crop: 'fill',
    quality: 'auto',
    fetch_format: 'auto'
  });
}

/**
 * Generate image transformation URL
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Transformation options
 * @returns {string} - Transformed URL
 */
function generateImageUrl(publicId, options = {}) {
  configureCloudinary();

  const {
    width = 800,
    height = null,
    crop = 'limit',
    quality = 'auto',
    format = 'auto',
    effect = null,
    background = null
  } = options;

  const transformation = {
    width,
    crop,
    quality,
    fetch_format: format
  };

  if (height) transformation.height = height;
  if (effect) transformation.effect = effect;
  if (background) transformation.background = background;

  return cloudinary.url(publicId, transformation);
}

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>}
 */
async function deleteImage(publicId) {
  configureCloudinary();

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result: result.result
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Check image moderation status
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>}
 */
async function checkModerationStatus(publicId) {
  configureCloudinary();

  try {
    const result = await cloudinary.api.resource(publicId, {
      moderation: true
    });

    return {
      publicId,
      moderationStatus: result.moderation ? result.moderation[0].status : 'unknown',
      moderationKind: result.moderation ? result.moderation[0].kind : null,
      response: result.moderation ? result.moderation[0].response : null
    };
  } catch (error) {
    console.error('Moderation check error:', error);
    throw new Error(`Moderation check failed: ${error.message}`);
  }
}

/**
 * Validate image file
 * @param {Object} file - File object
 * @returns {Object} - Validation result
 */
function validateImageFile(file) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!allowedTypes.includes(file.mimetype)) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` 
    };
  }

  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File too large. Max size: ${maxSize / 1024 / 1024}MB` 
    };
  }

  return { valid: true };
}

/**
 * Generate outfit preview composite image
 * Combines multiple wardrobe items into a single outfit preview
 * 
 * @param {Array<string>} publicIds - Array of image public IDs
 * @returns {string} - Composite image URL
 */
function generateOutfitPreview(publicIds) {
  configureCloudinary();

  if (!publicIds || publicIds.length === 0) {
    return null;
  }

  // Create a collage of outfit items
  // This is a simplified version - for production, you'd want more sophisticated layout
  const layers = publicIds.map((id, index) => ({
    overlay: id,
    width: 200,
    height: 200,
    crop: 'fill',
    gravity: 'center',
    x: (index % 3) * 210,
    y: Math.floor(index / 3) * 210
  }));

  return cloudinary.url(publicIds[0], {
    transformation: [
      { width: 640, height: 640, background: 'white' },
      ...layers
    ]
  });
}

/**
 * Get upload configuration for frontend
 * @returns {Object} - Client-side upload config
 */
function getClientUploadConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || 'fashionton_uploads',
    folder: 'fashionton/wardrobe',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
    moderation: true
  };
}

module.exports = {
  configureCloudinary,
  generateUploadSignature,
  uploadImage,
  generateThumbnailUrl,
  generateImageUrl,
  deleteImage,
  checkModerationStatus,
  validateImageFile,
  generateOutfitPreview,
  getClientUploadConfig
};
