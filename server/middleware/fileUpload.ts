import { Request, Response, NextFunction } from 'express';

/**
 * File Upload Validation Middleware
 * 
 * DEEP REASONING CHAIN:
 * File upload validation is critical for preventing:
 * 1. Malicious file uploads (executables, scripts)
 * 2. Denial of service attacks (large files)
 * 3. Server resource exhaustion
 * 4. Security vulnerabilities (file type spoofing)
 * 
 * This middleware validates:
 * 1. File size limits
 * 2. Allowed file types (MIME type and extension)
 * 3. File content validation (magic numbers)
 * 4. Filename sanitization
 * 
 * EDGE CASE ANALYSIS:
 * - Handles multiple file uploads
 * - Validates both MIME type and file extension
 * - Checks file content magic numbers for type verification
 * - Sanitizes filenames to prevent path traversal
 * - Provides detailed error messages for failed validations
 */

interface FileUploadOptions {
    maxSize?: number; // in bytes (default: 10MB)
    allowedTypes?: string[]; // MIME types
    allowedExtensions?: string[]; // File extensions
    requireAuth?: boolean;
}

const DEFAULT_OPTIONS: FileUploadOptions = {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'application/pdf',
        'text/plain',
        'text/csv',
        'application/json'
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf', '.txt', '.csv', '.json'],
    requireAuth: true
};

// Magic numbers for file type verification
const MAGIC_NUMBERS: Record<string, number[]> = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/gif': [0x47, 0x49, 0x46],
    'image/webp': [0x52, 0x49, 0x46, 0x46],
    'application/pdf': [0x25, 0x50, 0x44, 0x46]
};

/**
 * Check if file matches magic number for its type
 */
function verifyFileType(buffer: Buffer, mimeType: string): boolean {
    const magicNumbers = MAGIC_NUMBERS[mimeType];
    if (!magicNumbers) return true; // Skip verification for unknown types

    for (let i = 0; i < magicNumbers.length; i++) {
        if (buffer[i] !== magicNumbers[i]) {
            return false;
        }
    }
    return true;
}

/**
 * Sanitize filename to prevent path traversal
 */
function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.{2,}/g, '.') // Prevent path traversal
        .replace(/^\.+/, '') // Remove leading dots
        .substring(0, 255); // Limit length
}

/**
 * Validate single file
 */
function validateFile(
    file: Express.Multer.File,
    options: FileUploadOptions
): { valid: boolean; error?: string } {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Check file size
    if (file.size > opts.maxSize!) {
        return {
            valid: false,
            error: `File size exceeds maximum limit of ${opts.maxSize! / 1024 / 1024}MB`
        };
    }

    // Check file extension
    const ext = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (ext && opts.allowedExtensions && !opts.allowedExtensions.includes(ext)) {
        return {
            valid: false,
            error: `File type ${ext} is not allowed`
        };
    }

    // Check MIME type
    if (opts.allowedTypes && !opts.allowedTypes.includes(file.mimetype)) {
        return {
            valid: false,
            error: `MIME type ${file.mimetype} is not allowed`
        };
    }

    // Verify file content (magic numbers)
    if (file.buffer && MAGIC_NUMBERS[file.mimetype]) {
        if (!verifyFileType(file.buffer, file.mimetype)) {
            return {
                valid: false,
                error: 'File content does not match declared type'
            };
        }
    }

    return { valid: true };
}

/**
 * File upload validation middleware
 * Note: This should be used with multer or similar upload middleware
 */
export function validateFileUpload(options: FileUploadOptions = {}) {
    return (req: Request, res: Response, next: NextFunction) => {
        const opts = { ...DEFAULT_OPTIONS, ...options };

        // Check authentication if required
        if (opts.requireAuth && !(req as any).user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Check if files exist
        const files = req.files as Express.Multer.File[] | undefined;
        const file = req.file as Express.Multer.File | undefined;

        if (!files && !file) {
            return next(); // No files to validate
        }

        const filesToValidate = files ? [...files] : (file ? [file] : []);

        // Validate each file
        for (const f of filesToValidate) {
            const validation = validateFile(f, opts);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
            }

            // Sanitize filename
            f.originalname = sanitizeFilename(f.originalname);
        }

        next();
    };
}

/**
 * Check if request has file upload
 */
export function hasFileUpload(req: Request): boolean {
    return !!(req.file || req.files);
}

/**
 * Get file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
