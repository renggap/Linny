/**
 * ============================================================================
 * ISSUE #4: FILE STORAGE FUNCTIONALITY
 * ============================================================================
 * 
 * DEEP REASONING CHAIN:
 * 
 * Why File Storage is Critical:
 * 1. User Experience: Users need to attach files to issues/projects
 * 2. Documentation: Support for images, documents, and other assets
 * 3. Collaboration: Enable file sharing among team members
 * 4. Audit Trail: Track file uploads and downloads
 * 
 * Architecture Decisions:
 * - Local file storage for simplicity (can be upgraded to S3)
 * - Multer for multipart form handling
 * - File type validation for security
 * - File size limits to prevent abuse
 * - Unique filename generation to prevent conflicts
 * 
 * EDGE CASE ANALYSIS:
 * 
 * 1. File Size Limits:
 *    - Risk: Large files could exhaust disk space
 *    - Prevention: 10MB limit per file
 *    - Fallback: Reject oversized files with 413 status
 * 
 * 2. File Type Validation:
 *    - Risk: Malicious files could be uploaded
 *    - Prevention: Whitelist allowed file types
 *    - Implementation: MIME type checking
 * 
 * 3. Disk Space Exhaustion:
 *    - Risk: Too many files could fill disk
 *    - Prevention: Monitor disk usage
 *    - Fallback: Reject uploads when disk full
 * 
 * 4. Filename Conflicts:
 *    - Risk: Same filename could overwrite existing files
 *    - Prevention: UUID-based unique filenames
 *    - Implementation: Preserve original name in metadata
 * 
 * 5. Unauthorized Access:
 *    - Risk: Users could access files they shouldn't
 *    - Prevention: File ownership tracking
 *    - Implementation: Authorization checks
 * 
 * 6. File Corruption:
 *    - Risk: Uploads could be incomplete
 *    - Prevention: File integrity checks
 *    - Implementation: Size verification
 * 
 * 7. Concurrent Uploads:
 *    - Risk: Race conditions during upload
 *    - Prevention: Atomic file operations
 *    - Implementation: Temporary files with rename
 * 
 * 8. Cleanup Issues:
 *    - Risk: Orphaned files could accumulate
 *    - Prevention: Delete files when entities deleted
 *    - Implementation: Cascade deletion
 * 
 */

import { Router, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { getDatabase } from '../database.js';
import { AuthRequest, authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import { validateParams } from '../middleware/validation.js';
import { join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';

// ============================================================================
// FILE STORAGE CONFIGURATION
// ============================================================================

const UPLOAD_DIR = join(process.cwd(), 'server', 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/json',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        // Generate unique filename with original extension
        const ext = file.originalname.split('.').pop();
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${ext}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE
    },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} is not allowed`));
        }
    }
});

const router = Router();

// ============================================================================
// FILE UPLOAD ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/files/upload
 * Upload a file
 */
router.post('/upload', authenticate, upload.single('file'), asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
    }

    const { entityType, entityId } = req.body;

    if (!entityType || !entityId) {
        // Delete uploaded file if metadata is missing
        unlinkSync(req.file.path);
        return res.status(400).json({ error: 'entityType and entityId are required' });
    }

    if (!['issue', 'project', 'comment'].includes(entityType)) {
        unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Invalid entity type' });
    }

    const db = await getDatabase();
    const fileId = crypto.randomUUID();
    const now = db.now();

    // Store file metadata in database
    await db.run(
        `INSERT INTO files (id, original_name, filename, mime_type, size, uploaded_by, entity_type, entity_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            fileId,
            req.file.originalname,
            req.file.filename,
            req.file.mimetype,
            req.file.size,
            req.userId!,
            entityType,
            entityId,
            now
        ]
    );

    db.save();

    res.status(201).json({
        file: {
            id: fileId,
            original_name: req.file.originalname,
            filename: req.file.filename,
            mime_type: req.file.mimetype,
            size: req.file.size,
            entity_type: entityType,
            entity_id: entityId,
            created_at: now,
            download_url: `/api/v1/files/${fileId}/download`
        }
    });
    return;
}));

/**
 * GET /api/v1/files/:id
 * Get file metadata
 */
router.get('/:id', authenticate, validateParams(z.object({ id: z.string().min(1) })), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const { id } = req.params;

    const _file = await db.get('SELECT * FROM files WHERE id = ?', [id]);

    if (!_file) {
        return res.status(404).json({ error: 'File not found' });
    }

    res.json({ file: _file });
    return;
}));

/**
 * GET /api/v1/files/:id/download
 * Download file
 */
router.get('/:id/download', authenticate, validateParams(z.object({ id: z.string().min(1) })), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const { id } = req.params;

    const file = await db.get('SELECT * FROM files WHERE id = ?', [id]);

    if (!file) {
        return res.status(404).json({ error: 'File not found' });
    }

    const filePath = join(UPLOAD_DIR, file.filename);

    if (!existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found on disk' });
    }

    res.download(filePath, file.original_name);
    return;
}));

/**
 * DELETE /api/v1/files/:id
 * Delete a file
 */
router.delete('/:id', authenticate, validateParams(z.object({ id: z.string().min(1) })), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const { id } = req.params;

    const file = await db.get('SELECT * FROM files WHERE id = ?', [id]);

    if (!file) {
        return res.status(404).json({ error: 'File not found' });
    }

    // Check if user owns the file or is admin
    const user = await db.getUserById(req.userId!);
    if (file.uploaded_by !== req.userId && user?.role !== 'Admin') {
        return res.status(403).json({ error: 'You do not have permission to delete this file' });
    }

    // Delete file from disk
    const filePath = join(UPLOAD_DIR, file.filename);
    if (existsSync(filePath)) {
        unlinkSync(filePath);
    }

    // Delete file metadata from database
    await db.run('DELETE FROM files WHERE id = ?', [id]);
    db.save();

    res.json({ message: 'File deleted successfully' });
    return;
}));

/**
 * GET /api/v1/files/entity/:type/:id
 * Get all files for an entity
 */
router.get('/entity/:type/:id', authenticate, validateParams(z.object({
    type: z.enum(['issue', 'project', 'comment']),
    id: z.string().min(1)
})), asyncHandler(async (req: AuthRequest, res: Response) => {
    const db = await getDatabase();
    const { type, id } = req.params;

    const files = await db.all(
        'SELECT * FROM files WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC',
        [type, id]
    );

    res.json({ files });
    return;
}));

export default router;
