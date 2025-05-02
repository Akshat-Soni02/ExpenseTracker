import { createWorker } from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sharp from 'sharp';
const { DocumentProcessorServiceClient } = await import('@google-cloud/documentai').then(mod => mod.v1);
import stringSimilarity from 'string-similarity';
import {GoogleGenerativeAI} from '@google/generative-ai';
import PDFDocument from 'pdfkit';
import ErrorHandler from "../middlewares/error.js";


const TEMP_PDF_PATH = './temp-receipt.pdf';



const aliasMap = {
  amount: ['total_amount', 'amount', 'payable_amount', 'amount_due', 'grand_total','total', 'total_due', ],
  date: ['purchase_date', 'transaction_date', 'date', 'receipt_date'],
  vendor: ['vendor_name', 'supplier', 'store_name', 'retailer']
};

const exclusionKeywords = ['tax', 'discount', 'tip', 'subtotal', 'service_charge', 'vat'];

const categoryList = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "General"];

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
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

async function preprocessImage(inputPath, outputPath) {
    await sharp(inputPath)
      .greyscale()
      .normalize()
      .sharpen({ sigma: 1.5 })
      .threshold(170)
      .toFile(outputPath);
}

function normalizeDate(dateStr) {
  if (!dateStr) return "";

  const parsed = new Date(dateStr);
  return isNaN(parsed) ? "" : parsed.toISOString();
}

function extractField(entities, field, useFuzzy = false, threshold = 0.75) {
  const aliases = aliasMap[field];

  for (const entity of entities) {
    const type = entity.type.toLowerCase();
    const mention = (entity.mentionText || '').toLowerCase();

    const isExcluded = exclusionKeywords.some(keyword =>
      type.includes(keyword) || mention.includes(keyword)
    );
    if (isExcluded) continue;

    if (!useFuzzy) {
      if (aliases.includes(type)) {
        return {
          value: entity.mentionText,
          confidence: entity.confidence,
          rawType: entity.type
        };
      }
    } else {
      const bestMatch = stringSimilarity.findBestMatch(type, aliases);
      if (bestMatch.bestMatch.rating >= threshold) {
        return {
          value: entity.mentionText,
          confidence: entity.confidence,
          rawType: entity.type
        };
      }
    }
  }

  return null;
}
  
async function createTempPDF(text, filePath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);
    doc.text(text);
    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

async function processPDFWithDocumentAI(filePath) {
  console.log("Processing PDF with Document AI");
  const client = new DocumentProcessorServiceClient();
  const projectId = process.env.GCP_PROJECT_ID;
  const location = process.env.GCP_LOCATION; 
  const processorId = process.env.GCP_PROCESSOR_ID; 
  const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

  const fileContent = fs.readFileSync(filePath);
  if (!fileContent) {
    console.log('No file content found');
    return throwOCRError(next);
  }

  const request = {
    name,
    rawDocument: {
      content: Buffer.from(fileContent).toString('base64'),
      mimeType: 'application/pdf',
    },
  };

  const [result] = await client.processDocument(request);
  console.log('Document processing complete.');
  return result.document;
}

async function cleanupTempFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log('Temporary PDF deleted.');
  }
}

async function classifyWithGemini(receiptText) {
  const prompt = `
You are an intelligent receipt classifier. Given this receipt text, return only one of the following categories:
${categoryList.join(', ')}

Receipt Text:
"${receiptText}"

Only respond with the category name. No explanation.
`;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); 
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    console.log("Classifying receipt with Gemini");
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    // Sanitize and validate response
    const matched = categoryList.find(c => text.toLowerCase().includes(c.toLowerCase()));
    console.log("Gemini classification result:");
    return matched || "General";
  } catch (error) {
    console.error("Gemini classification error:", error.message);
    return "General";
  }
}

const upload = multer({ storage });

export const throwOCRError = (next) => {
    console.log('No image data provided');
    return next(new ErrorHandler("Cannot process OCR", 400));
}

export const processOCR = async (req,res,next)=>{
    try {
      if (process.env.GOOGLE_CREDENTIALS_BASE64) {
        const decoded = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8');
        const uploadDir = join(__dirname, '../tmp');
        
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir);
        }
        const credsPath = path.join('/tmp', 'gcloud-key.json'); // or any safe temp dir
        fs.writeFileSync(credsPath, decoded);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = credsPath;
      }else{
        console.log("No Google credentials found");
        return throwOCRError(next);
      }

      console.log(process.env.SMS_API_KEY + "env check");

        console.log("Processing OCR request");
        if (!req.body.image) {
          console.log('No image data provided');
          return throwOCRError(next);
        }

        const imageBuffer = Buffer.from(req.body.image, 'base64');
        const uploadDir = join(__dirname, '../uploads');
        
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir);
        }
        
        const originalImagePath = path.join(uploadDir, `${Date.now()}_original.jpg`);
        fs.writeFileSync(originalImagePath, imageBuffer);

        const preprocessedImagePath = originalImagePath.replace('_original.jpg', '_processed.jpg');

        await preprocessImage(originalImagePath, preprocessedImagePath);
        const worker = await createWorker('eng');
        if(!worker) {
          console.log('Failed to create Tesseract worker');
          return throwOCRError(next);
        }

        await worker.setParameters({
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,$%:/-',
          preserve_interword_spaces: '1',
        });

        const { data:processedData} = await worker.recognize(preprocessedImagePath);
        
        if (!processedData) {
          console.log('No data returned from Tesseract');
          return throwOCRError(next);
        }
        const text = processedData.text;
        await createTempPDF(text, TEMP_PDF_PATH);
        const document = await processPDFWithDocumentAI(TEMP_PDF_PATH);

        const amountInfo = extractField(document.entities, 'amount', true);
        const dateInfo = extractField(document.entities, 'date', true);
        const vendorInfo = extractField(document.entities, 'vendor', true);

        await cleanupTempFile(TEMP_PDF_PATH);

        fs.unlinkSync(originalImagePath);
        fs.unlinkSync(preprocessedImagePath);
        
        
        const category  = await classifyWithGemini(text);
        const data = {
          amount: amountInfo ? parseFloat(amountInfo.value.replace(/[^0-9.]/g, '')) : 0,
          date: dateInfo ? normalizeDate(dateInfo.value) : "",
          vendor: vendorInfo ? vendorInfo.value : "",
          category: category,
        };
      
        return res.status(200).json({
          data
        });
        
      } catch (error) {
        console.error('OCR processing error:', error);
        return throwOCRError(next);
      }
};