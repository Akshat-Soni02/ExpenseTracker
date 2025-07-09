import dotenv from "dotenv";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({
    path: path.resolve(__dirname, `../${process.env.NODE_ENV}.env`)
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const RedisConnection = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASS
};

export default {
    port: process.env.PORT || 3002,
    mongoUri: process.env.MONGO_URI,
};
  