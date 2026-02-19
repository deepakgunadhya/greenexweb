import * as multer from "multer";
import * as path from "path";
import * as fs from "fs";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
const imagesDir = path.join(uploadsDir, "images");
const documentsDir = path.join(uploadsDir, "documents");

// Create directories if they don't exist
[uploadsDir, imagesDir, documentsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine destination based on file type
    const isImage = file.mimetype.startsWith("image/");
    const destination = isImage ? imagesDir : documentsDir;
    cb(null, destination);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);

    // 🔐 sanitize filename (IMPORTANT)
    const safeName = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/\s+/g, "_") // spaces → _
      .replace(/[()]/g, "") // remove brackets
      .replace(/[^a-z0-9_-]/g, ""); // remove special chars

    cb(null, `${safeName}-${uniqueSuffix}${ext}`);
  },
});

// File filter for security
const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Allowed image types
  const allowedImageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  // Allowed document types
  const allowedDocumentTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];

  const allowedTypes = [...allowedImageTypes, ...allowedDocumentTypes];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(", ")}`
      )
    );
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Maximum 5 files per request
  },
});

// Export different upload configurations
export const uploadSingle = upload.single("file");
export const uploadMultiple = upload.array("files", 5);
export const uploadFields = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
  { name: "documents", maxCount: 5 },
]);

// Helper function to get file URL
// Returns absolute URL (protocol://host/uploads/...) to ensure it works regardless of request origin
export const getFileUrl = (
  req: any,
  filename: string,
  type: "images" | "documents" = "images"
): string => {
  // Generate absolute URL with protocol and host
  // This ensures images load correctly regardless of how the API is being accessed
  // (through /api/v1, /greenapi/api/v1, /cms, etc.)
  const protocol = req.protocol || "https";
  const host = req.get("host") || "localhost:3001";

  return `${protocol}://${host}/uploads/${type}/${filename}`;
};


// Helper function to delete file
export const deleteFile = (filepath: string): void => {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (error) {
    console.error("Error deleting file:", error);
  }
};

// Helper to get absolute file path
export const getAbsolutePath = (
  filename: string,
  type: "images" | "documents" = "images"
): string => {
  return path.join(type === "images" ? imagesDir : documentsDir, filename);
};

export { upload };
