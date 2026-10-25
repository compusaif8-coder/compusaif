import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public', 'upload');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Handle file upload
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    
    const relativePath = `/upload/${req.file.filename}`;
    res.json({ path: relativePath });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Handle product creation
router.post('/products', (req, res) => {
  try {
    const product = req.body;
    const storePath = path.join(process.cwd(), 'src', 'data', 'store.json');
    
    // Ensure directory exists
    const storeDir = path.dirname(storePath);
    if (!fs.existsSync(storeDir)) {
      fs.mkdirSync(storeDir, { recursive: true });
    }
    
    // Read existing store data
    let storeData = { products: [] };
    if (fs.existsSync(storePath)) {
      const fileContent = fs.readFileSync(storePath, 'utf-8');
      try {
        storeData = JSON.parse(fileContent);
      } catch (error) {
        console.error('Error parsing store.json:', error);
      }
    }
    
    // Initialize products array if it doesn't exist
    if (!Array.isArray(storeData.products)) {
      storeData.products = [];
    }
    
    // Add new product
    storeData.products.push(product);
    
    // Write updated data back to file
    fs.writeFileSync(storePath, JSON.stringify(storeData, null, 2));
    
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

export default router;