/**
 * pdfService.js — PDF text extraction + chunking
 */
const fs     = require('fs').promises;
const fsSync = require('fs');
const path   = require('path');
const os     = require('os');
const { execSync } = require('child_process');

const CHUNK_WORDS   = 600;  // target words per chunk
const OVERLAP_WORDS = 50;   // words shared between adjacent chunks

class PDFService {

  /* ── Page count ─────────────────────────────────────────── */
  async getPageCount(filePath) {
    try {
      const info  = execSync(`pdfinfo "${filePath}"`).toString('utf8');
      const match = info.match(/Pages:\s+(\d+)/);
      return match ? parseInt(match[1], 10) : 1;
    } catch {
      return 1;
    }
  }

  /* ── Text extraction ─────────────────────────────────────── */
  async extractText(filePath) {
    let text = '';

    // Try native pdftotext first (fast, accurate)
    try {
      const buf = execSync(`pdftotext -enc UTF-8 "${filePath}" -`, {
        maxBuffer: 100 * 1024 * 1024, // 100 MB
      });
      text = buf.toString('utf8');
    } catch (err) {
      console.warn('pdftotext warning:', err.message);
    }

    // Fallback to Tesseract OCR for scanned PDFs
    if (!text || text.trim() === '') {
      console.log('No text layer — running Tesseract OCR…');
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ocr-'));
      try {
        execSync(`pdftoppm -jpeg -r 150 "${filePath}" "${path.join(tmpDir, 'page')}"`);
        const pages = fsSync.readdirSync(tmpDir).filter(f => f.endsWith('.jpg')).sort();
        if (!pages.length) throw new Error('No pages extracted for OCR');
        for (const pg of pages) {
          const imgPath = path.join(tmpDir, pg);
          const ocrOut  = execSync(`tesseract "${imgPath}" stdout -l eng --oem 1 --psm 3`, {
            maxBuffer: 50 * 1024 * 1024,
          });
          text += ocrOut.toString('utf8') + '\n\n';
        }
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    }

    if (!text || text.trim() === '') {
      throw new Error('No readable text found in this PDF, even after OCR.');
    }

    return text;
  }

  /* ── Chunking ─────────────────────────────────────────────
   * Splits a large text into overlapping word-window chunks.
   * Each chunk ~ CHUNK_WORDS words, with OVERLAP_WORDS overlap.
   *
   * Example for a 500-page PDF (~150,000 words):
   *   → ~272 chunks of ~600 words with 50-word overlap
   */
  chunkText(text, chunkSize = CHUNK_WORDS, overlap = OVERLAP_WORDS) {
    const words  = text.split(/\s+/).filter(Boolean);
    const chunks = [];
    let start    = 0;

    while (start < words.length) {
      const end = Math.min(start + chunkSize, words.length);
      chunks.push(words.slice(start, end).join(' '));
      if (end === words.length) break;
      start = end - overlap; // slide window with overlap
    }

    return chunks;
  }

  /* ── Cleanup ─────────────────────────────────────────────── */
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.warn('File deletion warning:', err.message);
    }
  }
}

module.exports = new PDFService();
