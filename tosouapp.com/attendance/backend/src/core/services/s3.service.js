const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'tosouapp';

let s3Client = null;

if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Uploads a buffer to R2
 * @param {string} key - The file path/name in the bucket
 * @param {Buffer} body - The file content
 * @param {string} contentType - The MIME type
 * @returns {Promise<boolean>}
 */
async function uploadToR2(key, body, contentType = 'application/octet-stream') {
  if (!s3Client) return false;
  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('S3 Upload Error:', error);
    return false;
  }
}

/**
 * Downloads a buffer from R2
 * @param {string} key - The file path/name in the bucket
 * @returns {Promise<Buffer|null>}
 */
async function downloadFromR2(key) {
  if (!s3Client) return null;
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    const response = await s3Client.send(command);
    
    // Convert readable stream to buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (error) {
    if (error.name === 'NoSuchKey') return null;
    console.error('S3 Download Error:', error);
    return null;
  }
}

/**
 * Deletes a file from R2
 * @param {string} key - The file path/name in the bucket
 * @returns {Promise<boolean>}
 */
async function deleteFromR2(key) {
  if (!s3Client) return false;
  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('S3 Delete Error:', error);
    return false;
  }
}

function isR2Configured() {
  return !!s3Client;
}

module.exports = {
  uploadToR2,
  downloadFromR2,
  deleteFromR2,
  isR2Configured
};
