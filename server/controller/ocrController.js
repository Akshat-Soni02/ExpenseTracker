import { createWorker } from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import multer from 'multer';


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, '${Date.now()}-${file.originalname}');
    }
  });
  
const upload = multer({ storage });

export const processOCR = async (req,res,next)=>{
    try {
        console.log("Processing OCR request");
        // Check if image data is provided in the request body
        if (!req.body.image) {
          return res.status(400).json({ success: false, error: 'No image provided' });
        }
    
        // Save the base64 image to a temporary file
        const imageBuffer = Buffer.from(req.body.image, 'base64');
        const uploadDir = path.join(__dirname, 'uploads');
        
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir);
        }
        
        const imagePath = path.join(uploadDir, "${Date.now()}.jpg");
        fs.writeFileSync(imagePath, imageBuffer);
    
        // Initialize Tesseract worker
        const worker = await createWorker();
        
        // Set Tesseract configuration for receipt processing
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        await worker.setParameters({
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,$%:/-',
          preserve_interword_spaces: '1',
        });
    
        // Recognize text
        const { data } = await worker.recognize(imagePath);
        
        // Extract receipt information using regex or pattern matching
        const text = data.text;
    
        // Clean up temporary file
        fs.unlinkSync(imagePath);
        
        // Terminate worker
        await worker.terminate();
    
        // Process and extract structured information
        const processedData = {
          rawText: text,
          // You can add more sophisticated extraction here
        };
    
        return res.json({
          success: true,
          results: text,
          processedData
        });
        
      } catch (error) {
        console.error('OCR processing error:', error);
        return res.status(500).json({
          success: false,
          error: 'Error processing image'
        });
      }
};