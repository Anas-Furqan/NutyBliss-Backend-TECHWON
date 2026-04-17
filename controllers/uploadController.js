const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'products';

const isPublishableKey = (key) => typeof key === 'string' && key.startsWith('sb_publishable_');

const getConfigError = () => {
  if (!SUPABASE_URL) {
    return 'Supabase env missing: set SUPABASE_URL in backend .env';
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return 'Supabase env missing: set SUPABASE_SERVICE_ROLE_KEY in backend .env for admin uploads';
  }

  if (isPublishableKey(SUPABASE_SERVICE_ROLE_KEY)) {
    return 'Invalid SUPABASE_SERVICE_ROLE_KEY: found a publishable key. Use the secret service-role key from Supabase Project Settings > API.';
  }

  return null;
};

const formatSupabaseError = (error) => {
  if (!error) return 'Supabase upload failed';

  const parts = [error.message, error.code, error.error, error.statusCode]
    .filter(Boolean)
    .map((value) => String(value));

  const text = parts.join(' | ') || 'Supabase upload failed';
  return text;
};

const isRlsError = (error) => {
  const msg = (error?.message || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  return msg.includes('row-level security') || code === '42501';
};

const getSupabase = () => {
  const configError = getConfigError();
  if (configError) {
    throw new Error(configError);
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
};

// Store files in memory; upload to Supabase Storage in controller.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test((file.mimetype || '').toLowerCase());
    if (extname && mimetype) return cb(null, true);
    return cb(new Error('Only image files are allowed'));
  },
});

exports.uploadMiddleware = upload;

const buildObjectPath = (originalname) => {
  const ext = path.extname(originalname).toLowerCase() || '.jpg';
  const name = crypto.randomBytes(16).toString('hex');
  const datePrefix = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `products/${datePrefix}/${name}${ext}`;
};

const getPublicUrl = (supabase, objectPath) => {
  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(objectPath);
  return data?.publicUrl;
};

const isBucketMissingError = (error) => {
  const message = (error?.message || '').toLowerCase();
  return message.includes('bucket not found') || message.includes('not found');
};

const ensureBucketExists = async (supabase) => {
  const { error } = await supabase.storage.createBucket(SUPABASE_BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  });

  if (!error) return { ok: true };

  // If bucket already exists (race condition/manual creation), continue.
  const msg = (error.message || '').toLowerCase();
  if (msg.includes('already exists') || msg.includes('duplicate')) {
    return { ok: true };
  }

  return { ok: false, error };
};

const uploadToBucket = async (supabase, objectPath, file) => {
  let uploadResult = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (!uploadResult.error || !isBucketMissingError(uploadResult.error)) {
    return uploadResult;
  }

  const ensure = await ensureBucketExists(supabase);
  if (!ensure.ok) {
    return {
      data: null,
      error: {
        message: `Supabase bucket "${SUPABASE_BUCKET}" is missing and could not be created automatically. ${formatSupabaseError(ensure.error)}`,
      },
    };
  }

  // Retry upload after bucket creation.
  uploadResult = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  return uploadResult;
};

// Upload single image
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    const supabase = getSupabase();
    const objectPath = buildObjectPath(req.file.originalname);

    const { error } = await uploadToBucket(supabase, objectPath, req.file);

    if (error) {
      const message = formatSupabaseError(error);
      const statusCode = isRlsError(error) ? 403 : 500;
      return res.status(statusCode).json({
        success: false,
        message
      });
    }

    const publicUrl = getPublicUrl(supabase, objectPath);

    res.json({
      success: true,
      url: publicUrl,
      path: objectPath
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Upload multiple images
exports.uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }
    const supabase = getSupabase();
    const files = req.files;

    const images = [];
    for (const file of files) {
      const objectPath = buildObjectPath(file.originalname);
      const { error } = await uploadToBucket(supabase, objectPath, file);

      if (error) {
        const message = formatSupabaseError(error);
        const statusCode = isRlsError(error) ? 403 : 500;
        return res.status(statusCode).json({
          success: false,
          message
        });
      }

      images.push({
        url: getPublicUrl(supabase, objectPath),
        path: objectPath,
      });
    }

    res.json({
      success: true,
      images
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete image
exports.deleteImage = async (req, res) => {
  try {
    const { filename } = req.params;
    const supabase = getSupabase();

    const objectPath = decodeURIComponent(filename);
    const { error } = await supabase.storage.from(SUPABASE_BUCKET).remove([objectPath]);
    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete image'
      });
    }

    res.json({
      success: true,
      message: 'Image deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
