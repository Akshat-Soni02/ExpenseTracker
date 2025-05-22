import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
console.log(process.env.NODE_ENV);
console.log(__dirname);

dotenv.config({
    path: path.resolve(__dirname, `../${process.env.NODE_ENV}.env`)
});
console.log(process.env.PORT);

export default {
    port: process.env.PORT || 3002,
    mongoUri: process.env.MONGO_URI,
};
  