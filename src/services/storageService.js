import { v2 as cloudinary } from 'cloudinary';
import path from 'path';

/**
 * Storage service for bill photos.
 * If Cloudinary credentials are provided, uploads directly to Cloudinary.
 * Otherwise, stores locally and serves via Express static file route.
 */
export const uploadBillImage = async (file, req) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret && cloudName.trim() !== '') {
    try {
      cloudinary.config({
        cloud_name: cloudName.trim(),
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim(),
      });

      console.log('[Storage]: Uploading bill image to Cloudinary...');
      const uploadRes = await cloudinary.uploader.upload(file.path, {
        folder: 'restaurant_bills',
        resource_type: 'image',
      });

      console.log('[Storage]: Successfully uploaded to Cloudinary ->', uploadRes.secure_url);

      return {
        url: uploadRes.secure_url,
        public_id: uploadRes.public_id,
        provider: 'Cloudinary',
      };
    } catch (err) {
      console.error('[Cloudinary Upload Error]:', err.message);
      console.warn('[Storage]: Falling back to local storage URL.');
    }
  }

  // Fallback to local server static URL
  const protocol = (req && req.protocol) || 'http';
  const host = (req && typeof req.get === 'function' ? req.get('host') : null) || 'localhost:5000';
  const localUrl = `${protocol}://${host}/uploads/${file.filename}`;

  return {
    url: localUrl,
    filename: file.filename,
    provider: 'LocalStorage',
  };
};

