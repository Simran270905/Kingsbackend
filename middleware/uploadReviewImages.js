// NEW FILE
import multer from 'multer';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { 
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 5 // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'), false);
    }
  },
});

export const uploadReviewImages = upload.array('images', 5);
