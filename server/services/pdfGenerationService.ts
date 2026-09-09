/**
 * pdfGenerationService.ts
 *
 * Uses puppeteer-core with the host's Microsoft Edge or Chrome executable
 * to pre-build consolidated A4 report card PDFs in the background.
 */

import puppeteer, { Browser } from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

export const INTERNAL_RENDER_SECRET = process.env.INTERNAL_RENDER_SECRET || 'muchi_internal_pdf_secret_2026';

const STORAGE_DIR = path.resolve(process.cwd(), 'server', 'storage', 'pdf-cache');

// In-flight PDF generation locks to prevent duplicate concurrent runs
const pdfInFlight = new Set<string>();

export interface PdfKey {
  schoolId: string;
  classId: string;
  term: string;
  examType: string;
  academicYear: string;
  className?: string;
}

export interface PdfWorkerState {
  currentSchoolId: string | null;
  currentClassId: string | null;
  currentClassLabel: string | null;
  isCompiling: boolean;
  startedAt: string | null;
}

export const pdfWorkerState: PdfWorkerState = {
  currentSchoolId: null,
  currentClassId: null,
  currentClassLabel: null,
  isCompiling: false,
  startedAt: null,
};

export function getPdfWorkerState(): PdfWorkerState {
  return { ...pdfWorkerState };
}

function sanitize(val: string): string {
  return String(val || '').replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Returns the local file path for a cached PDF.
 */
export function getPdfCacheFilePath(key: PdfKey): string {
  const schoolFolder = path.join(STORAGE_DIR, sanitize(key.schoolId));
  const filename = `${sanitize(key.classId)}_${sanitize(key.term)}_${sanitize(key.examType)}_${sanitize(key.academicYear)}.pdf`;
  return path.join(schoolFolder, filename);
}

/**
 * Check if the pre-built PDF exists on disk.
 */
export function isClassPdfReady(key: PdfKey): boolean {
  try {
    const filePath = getPdfCacheFilePath(key);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      return stat.size > 5000; // Valid consolidated report card PDF is at least > 5KB
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Delete a cached PDF (e.g. when grades are edited or submitted).
 */
export function deleteClassPdf(key: PdfKey): void {
  try {
    const filePath = getPdfCacheFilePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[PdfService] Deleted outdated PDF: ${filePath}`);
    }
  } catch (err: any) {
    console.warn(`[PdfService] Error deleting PDF:`, err.message);
  }
}

/**
 * Detects the installed browser executable path on Windows or Linux.
 */
export function getBrowserExecutablePath(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const candidatePaths = [
    // Windows Microsoft Edge
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    // Windows Google Chrome
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    // Linux / Mac paths
    '/usr/bin/microsoft-edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  throw new Error(
    'No compatible browser executable (Edge or Chrome) found on host system for PDF generation.'
  );
}

/**
 * Pre-builds the class PDF in the background using headless Edge.
 * Strict sequence: Call this AFTER database calculation is saved.
 */
export async function generateClassPdf(key: PdfKey): Promise<string | null> {
  const fileKey = `${key.schoolId}|${key.classId}|${key.term}|${key.examType}|${key.academicYear}`;
  if (pdfInFlight.has(fileKey)) {
    console.log(`[PdfService] PDF generation already in flight for ${fileKey}`);
    return null;
  }

  pdfInFlight.add(fileKey);
  const targetPath = getPdfCacheFilePath(key);
  const targetDir = path.dirname(targetPath);

  let browser: Browser | null = null;
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const execPath = getBrowserExecutablePath();
    const port = process.env.CLIENT_PORT || process.env.VITE_PORT || '8080';
    const renderUrl = `http://localhost:${port}/render-class-report-cards?schoolId=${encodeURIComponent(
      key.schoolId
    )}&classId=${encodeURIComponent(key.classId)}&term=${encodeURIComponent(
      key.term
    )}&examType=${encodeURIComponent(key.examType)}&academicYear=${encodeURIComponent(
      key.academicYear
    )}&token=${encodeURIComponent(INTERNAL_RENDER_SECRET)}`;

    console.log(`[PdfService] Launching headless browser for ${key.classId} (${key.term})…`);

    pdfWorkerState.currentSchoolId = key.schoolId;
    pdfWorkerState.currentClassId = key.classId;
    pdfWorkerState.currentClassLabel = key.className
      ? `${key.className} (${key.term} - ${key.examType})`
      : `${key.term} - ${key.examType}`;
    pdfWorkerState.isCompiling = true;
    pdfWorkerState.startedAt = new Date().toISOString();

    browser = await puppeteer.launch({
      executablePath: execPath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=medium',
      ],
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(180000);
    await page.setViewport({ width: 1240, height: 1754 }); // A4 at 150 DPI approx

    // Navigate to local render page
    await page.goto(renderUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    // Wait until the React component signals that all report cards are rendered or error
    await page.waitForSelector('#render-complete, #render-error', { timeout: 60000 });
    const hasError = await page.$('#render-error');
    if (hasError) {
      console.warn(`[PdfService] Render error detected on client page for ${fileKey}.`);
      return null;
    }

    console.log(`[PdfService] DOM rendered. Compiling PDF to ${targetPath}…`);

    // Delete any old invalid/corrupt file first
    if (fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath);
      } catch (_) {}
    }

    await page.pdf({
      path: targetPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      timeout: 180000,
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm',
      },
    });

    // Verify written PDF is valid and not an empty stub
    const writtenStat = fs.statSync(targetPath);
    if (writtenStat.size < 5000) {
      console.warn(`[PdfService] Generated PDF is suspiciously small (${writtenStat.size} bytes). Removing.`);
      try { fs.unlinkSync(targetPath); } catch (_) {}
      return null;
    }

    console.log(`[PdfService] Successfully compiled PDF for class ${key.classId} (${writtenStat.size} bytes) ✓`);
    return targetPath;
  } catch (err: any) {
    console.error(`[PdfService] PDF generation failed for ${fileKey}:`, err.message);
    return null;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }
    pdfWorkerState.isCompiling = false;
    pdfWorkerState.currentSchoolId = null;
    pdfWorkerState.currentClassId = null;
    pdfWorkerState.currentClassLabel = null;
    pdfWorkerState.startedAt = null;
    pdfInFlight.delete(fileKey);
  }
}
