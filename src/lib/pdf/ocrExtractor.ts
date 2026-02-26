/**
 * OCR Extraction Module
 * 
 * Uses Tesseract.js to perform OCR on PDF pages rendered to canvas.
 * This is used as a fallback when standard text extraction fails (scanned/image PDFs).
 * Enhanced with image preprocessing and adaptive DPI retry for low-confidence pages.
 */

import * as pdfjsLib from 'pdfjs-dist';
import { createWorker, Worker } from 'tesseract.js';
import { preprocessResumeText } from './textPreprocessor';

export interface OCRProgress {
  page: number;
  total: number;
  status: string;
}

export type OCRProgressCallback = (progress: OCRProgress) => void;

/** Minimum confidence threshold for a page (0-100). Below this, retry at higher DPI. */
const MIN_PAGE_CONFIDENCE = 30;

/**
 * Preprocess an image on canvas for better OCR:
 * Convert to grayscale and increase contrast.
 */
function preprocessImageForOCR(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Convert to grayscale using luminance formula
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    
    // Apply contrast enhancement (stretch histogram)
    const contrast = 1.5; // 1.5x contrast boost
    const adjusted = Math.min(255, Math.max(0, ((gray - 128) * contrast) + 128));
    
    // Apply adaptive thresholding for very dark/light pixels
    const final = adjusted < 80 ? 0 : adjusted > 200 ? 255 : adjusted;
    
    data[i] = final;
    data[i + 1] = final;
    data[i + 2] = final;
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Extract text from a PDF using OCR.
 * Renders each page to canvas and runs Tesseract OCR on the image.
 * Enhanced with image preprocessing and adaptive DPI retry.
 * 
 * @param file - The PDF file to process
 * @param onProgress - Optional callback for progress updates
 * @returns Promise<string> - The extracted text from all pages
 */
export async function extractTextWithOCR(
  file: File,
  onProgress?: OCRProgressCallback
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  
  // Load PDF document
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  
  // Initialize Tesseract worker once for all pages (more efficient)
  onProgress?.({ page: 0, total: numPages, status: 'Initializing OCR engine...' });
  
  let worker: Worker;
  try {
    worker = await createWorker('eng');
  } catch (error) {
    console.error('Failed to initialize Tesseract worker:', error);
    throw new Error(
      'Failed to initialize OCR engine. Please check your internet connection and try again.'
    );
  }
  
  const pageTexts: string[] = [];
  
  try {
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      onProgress?.({ 
        page: pageNum, 
        total: numPages, 
        status: `Processing page ${pageNum} of ${numPages}...` 
      });
      
      // First attempt at standard scale (2x)
      const { text, confidence } = await extractPageWithOCR(pdf, pageNum, worker, 2);
      
      // If confidence is very low, retry at higher DPI (3x)
      if (confidence < MIN_PAGE_CONFIDENCE && numPages <= 5) {
        onProgress?.({
          page: pageNum,
          total: numPages,
          status: `Re-processing page ${pageNum} at higher quality...`,
        });
        const retry = await extractPageWithOCR(pdf, pageNum, worker, 3);
        if (retry.confidence > confidence) {
          pageTexts.push(retry.text);
          continue;
        }
      }
      
      pageTexts.push(text);
    }
  } finally {
    // Always terminate worker to free memory
    await worker.terminate();
  }
  
  const fullText = pageTexts.join('\n\n');
  
  // Check if OCR produced meaningful content
  const cleanedText = fullText.replace(/\s+/g, ' ').trim();
  const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;
  if (cleanedText.length < 100 || wordCount < 5) {
    throw new Error(
      'OCR could not extract readable text. The PDF may be too low quality or contain no recognizable text.'
    );
  }
  
  // Apply text preprocessing to clean OCR artifacts
  return preprocessResumeText(fullText, pageTexts);
}

/**
 * Render a single PDF page to canvas and run OCR on it.
 */
async function extractPageWithOCR(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  worker: Worker,
  scale = 2
): Promise<{ text: string; confidence: number }> {
  const page = await pdf.getPage(pageNum);
  
  const viewport = page.getViewport({ scale });
  
  // Create canvas for rendering (cap at 2048px for iOS WebKit compatibility)
  const maxCanvasDim = 2048;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  
  if (!context) {
    throw new Error('Failed to create canvas context for OCR');
  }
  
  let canvasWidth = viewport.width;
  let canvasHeight = viewport.height;
  let renderViewport = viewport;

  if (canvasWidth > maxCanvasDim || canvasHeight > maxCanvasDim) {
    // Compute scale factor so the render exactly matches the capped canvas size
    const capScaleFactor = maxCanvasDim / Math.max(canvasWidth, canvasHeight);
    canvasWidth = Math.round(canvasWidth * capScaleFactor);
    canvasHeight = Math.round(canvasHeight * capScaleFactor);
    // Re-derive a viewport at the adjusted scale so render ↔ canvas sizes match
    renderViewport = page.getViewport({ scale: scale * capScaleFactor });
  }

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  // Render PDF page to canvas using the correctly-scaled viewport
  await page.render({
    canvasContext: context,
    viewport: renderViewport,
  }).promise;
  
  // Apply image preprocessing for better OCR accuracy
  preprocessImageForOCR(canvas);
  
  // Convert canvas to image data for Tesseract
  const imageData = canvas.toDataURL('image/png');
  
  // Run OCR on the rendered image
  const { data: { text, confidence: ocrConfidence } } = await worker.recognize(imageData);
  
  // Clean up canvas to free memory
  canvas.width = 0;
  canvas.height = 0;
  
  return { text: text.trim(), confidence: ocrConfidence };
}

/**
 * Estimate OCR processing time based on page count.
 * Returns a human-readable string.
 */
export function estimateOCRTime(pageCount: number): string {
  // Rough estimate: ~10-15 seconds per page on average
  const minSeconds = pageCount * 10;
  const maxSeconds = pageCount * 20;
  
  if (maxSeconds < 60) {
    return `${minSeconds}-${maxSeconds} seconds`;
  } else {
    const minMinutes = Math.ceil(minSeconds / 60);
    const maxMinutes = Math.ceil(maxSeconds / 60);
    return `${minMinutes}-${maxMinutes} minutes`;
  }
}

/**
 * Load an image file into an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Extract text from an image file using OCR.
 * Works with JPG, PNG, and other image formats.
 * 
 * @param file - The image file to process
 * @param onProgress - Optional callback for progress updates
 * @returns Promise<string> - The extracted text
 */
export async function extractTextFromImage(
  file: File,
  onProgress?: OCRProgressCallback
): Promise<string> {
  onProgress?.({ page: 1, total: 1, status: 'Loading image...' });
  
  // Load image
  const img = await loadImage(file);
  
  // Create canvas at image dimensions (cap at 4000px for performance)
  const maxDim = 4000;
  let width = img.width;
  let height = img.height;
  
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create canvas context for OCR');
  }
  
  // Draw image to canvas
  ctx.drawImage(img, 0, 0, width, height);
  
  // Clean up object URL
  URL.revokeObjectURL(img.src);
  
  onProgress?.({ page: 1, total: 1, status: 'Initializing OCR engine...' });
  
  // Initialize Tesseract worker
  let worker: Worker;
  try {
    worker = await createWorker('eng');
  } catch (error) {
    console.error('Failed to initialize Tesseract worker:', error);
    throw new Error(
      'Failed to initialize OCR engine. Please check your internet connection and try again.'
    );
  }
  
  try {
    onProgress?.({ page: 1, total: 1, status: 'Extracting text...' });
    
    // Convert canvas to image data for Tesseract
    const imageData = canvas.toDataURL('image/png');
    
    // Run OCR
    const { data: { text } } = await worker.recognize(imageData);
    
    // Clean up
    canvas.width = 0;
    canvas.height = 0;
    
    const cleanedText = text.replace(/\s+/g, ' ').trim();
    if (cleanedText.length < 20) {
      throw new Error(
        'OCR could not extract readable text. The image may be too low quality or contain no recognizable text.'
      );
    }
    
    return text.trim();
  } finally {
    await worker.terminate();
  }
}
