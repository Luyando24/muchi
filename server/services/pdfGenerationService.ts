/**
 * Builds consolidated report-card PDFs and persists them in private Supabase
 * Storage. Development uses an installed browser; Vercel uses serverless Chromium.
 */
import chromium from '@sparticuz/chromium';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import * as tus from 'tus-js-client';
import JSZip from 'jszip';
import { supabaseAdmin } from '../lib/supabase.js';

export const PDF_STORAGE_BUCKET = process.env.REPORT_CARD_PDF_BUCKET || 'report-card-pdfs';
const MIN_PDF_BYTES = 5_000;
const LARGE_UPLOAD_BYTES = 6 * 1024 * 1024;
const QUEUE_FOLDER = '_queue';
const WORKER_LEASE_PATH = '_worker/report-card-pdfs.json';
const WORKER_LEASE_MS = 6 * 60 * 1000;
const RENDER_CHUNK_SIZE = Math.min(
  50,
  Math.max(12, Number.parseInt(process.env.PDF_RENDER_CHUNK_SIZE || '40', 10) || 40),
);
const RENDER_CONCURRENCY = Math.min(
  3,
  Math.max(1, Number.parseInt(process.env.PDF_RENDER_CONCURRENCY || '2', 10) || 2),
);

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const INTERNAL_RENDER_SECRET = process.env.INTERNAL_RENDER_SECRET
  || (serviceKey
    ? createHash('sha256').update(`${serviceKey}:muchi-pdf-render`).digest('hex')
    : 'muchi_local_pdf_render_2026');
const RENDER_TOKEN_TTL_MS = 5 * 60 * 1000;

let bucketReady: Promise<void> | null = null;
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
  phase: 'idle' | 'rendering' | 'uploading' | 'failed';
  startedAt: string | null;
  bytesUploaded: number;
  totalBytes: number;
  lastError: string | null;
  lastErrorAt: string | null;
}

function renderTokenPayload(key: PdfKey, expiresAt: number): string {
  return [key.schoolId, key.classId, key.term, key.examType, key.academicYear, expiresAt].join('|');
}

export function createInternalRenderToken(key: PdfKey): string {
  const expiresAt = Date.now() + RENDER_TOKEN_TTL_MS;
  const signature = createHmac('sha256', INTERNAL_RENDER_SECRET)
    .update(renderTokenPayload(key, expiresAt))
    .digest('base64url');
  return `${expiresAt}.${signature}`;
}

export function verifyInternalRenderToken(key: PdfKey, token: string): boolean {
  const [rawExpiry, suppliedSignature, ...extra] = token.split('.');
  const expiresAt = Number(rawExpiry);
  if (extra.length || !Number.isSafeInteger(expiresAt) || expiresAt < Date.now()) return false;
  if (expiresAt > Date.now() + RENDER_TOKEN_TTL_MS + 30_000) return false;

  const expectedSignature = createHmac('sha256', INTERNAL_RENDER_SECRET)
    .update(renderTokenPayload(key, expiresAt))
    .digest('base64url');
  const supplied = Buffer.from(suppliedSignature || '');
  const expected = Buffer.from(expectedSignature);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export const pdfWorkerState: PdfWorkerState = {
  currentSchoolId: null,
  currentClassId: null,
  currentClassLabel: null,
  isCompiling: false,
  phase: 'idle',
  startedAt: null,
  bytesUploaded: 0,
  totalBytes: 0,
  lastError: null,
  lastErrorAt: null,
};

export function getPdfWorkerState(): PdfWorkerState {
  return { ...pdfWorkerState };
}

function sanitize(value: string): string {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getServerConfig() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) throw new Error('Supabase server credentials are required for PDF storage.');
  return { url, key };
}

export function getPdfStorageObjectPath(key: PdfKey): string {
  const filename = `${sanitize(key.classId)}_${sanitize(key.term)}_${sanitize(key.examType)}_${sanitize(key.academicYear)}.pdf`;
  return `${sanitize(key.schoolId)}/${filename}`;
}

function storedFileSize(file: any): number {
  return Number(file?.metadata?.size ?? file?.metadata?.contentLength ?? 0);
}

export async function ensurePdfStorageBucket(): Promise<void> {
  if (bucketReady) return bucketReady;
  bucketReady = (async () => {
    getServerConfig();
    const existing = await supabaseAdmin.storage.getBucket(PDF_STORAGE_BUCKET);
    if (!existing.error && existing.data) return;
    const created = await supabaseAdmin.storage.createBucket(PDF_STORAGE_BUCKET, {
      public: false,
      allowedMimeTypes: ['application/pdf', 'application/json'],
    });
    if (created.error && !/already exists|duplicate/i.test(created.error.message)) {
      throw new Error(`Unable to create PDF bucket: ${created.error.message}`);
    }
  })().catch((error) => {
    bucketReady = null;
    throw error;
  });
  return bucketReady;
}

export async function listReadyClassPdfPaths(schoolId: string): Promise<Set<string>> {
  await ensurePdfStorageBucket();
  const folder = sanitize(schoolId);
  const ready = new Set<string>();
  const limit = 1_000;
  let offset = 0;
  while (true) {
    const result = await supabaseAdmin.storage.from(PDF_STORAGE_BUCKET).list(folder, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (result.error) throw new Error(`Unable to list PDFs: ${result.error.message}`);
    for (const file of result.data || []) {
      if (file.name.endsWith('.pdf') && storedFileSize(file) > MIN_PDF_BYTES) {
        ready.add(`${folder}/${file.name}`);
      }
    }
    if (!result.data || result.data.length < limit) break;
    offset += limit;
  }
  return ready;
}

export async function isClassPdfReady(key: PdfKey): Promise<boolean> {
  await ensurePdfStorageBucket();
  const objectPath = getPdfStorageObjectPath(key);
  const slash = objectPath.lastIndexOf('/');
  const folder = objectPath.slice(0, slash);
  const filename = objectPath.slice(slash + 1);
  const result = await supabaseAdmin.storage.from(PDF_STORAGE_BUCKET).list(folder, {
    limit: 10,
    search: filename,
  });
  if (result.error) throw new Error(`Unable to check PDF: ${result.error.message}`);
  const exact = (result.data || []).find((file: any) => file.name === filename);
  return !!exact && storedFileSize(exact) > MIN_PDF_BYTES;
}

export async function deleteClassPdf(key: PdfKey): Promise<void> {
  if (!key.schoolId) return;
  await ensurePdfStorageBucket();
  const result = await supabaseAdmin.storage
    .from(PDF_STORAGE_BUCKET)
    .remove([getPdfStorageObjectPath(key)]);
  if (result.error && !/not found/i.test(result.error.message)) throw result.error;
}

export async function createClassPdfDownloadUrl(key: PdfKey, filename: string): Promise<string> {
  await ensurePdfStorageBucket();
  const result = await supabaseAdmin.storage
    .from(PDF_STORAGE_BUCKET)
    .createSignedUrl(getPdfStorageObjectPath(key), 60, { download: filename });
  if (result.error || !result.data?.signedUrl) {
    throw new Error(`Unable to create PDF download: ${result.error?.message || 'Storage error'}`);
  }
  return result.data.signedUrl;
}

function resumableEndpoint(supabaseUrl: string): string {
  const url = new URL(supabaseUrl);
  if (url.hostname.endsWith('.supabase.co') && !url.hostname.includes('.storage.supabase.co')) {
    url.hostname = url.hostname.replace(/\.supabase\.co$/, '.storage.supabase.co');
  }
  url.pathname = '/storage/v1/upload/resumable';
  url.search = '';
  return url.toString();
}

async function uploadLargePdf(path: string, buffer: Buffer, metadata: Record<string, string>) {
  const config = getServerConfig();
  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(buffer, {
      endpoint: resumableEndpoint(config.url),
      retryDelays: [0, 3_000, 5_000, 10_000, 20_000],
      chunkSize: LARGE_UPLOAD_BYTES,
      uploadSize: buffer.length,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      storeFingerprintForResuming: false,
      headers: { authorization: `Bearer ${config.key}`, 'x-upsert': 'true' },
      metadata: {
        bucketName: PDF_STORAGE_BUCKET,
        objectName: path,
        contentType: 'application/pdf',
        cacheControl: '3600',
        ...metadata,
      },
      onProgress: (sent, total) => {
        pdfWorkerState.bytesUploaded = sent;
        pdfWorkerState.totalBytes = total;
      },
      onError: (error) => reject(new Error(`Supabase resumable upload failed: ${error.message}`)),
      onSuccess: () => resolve(),
    });
    upload.start();
  });
}

export async function uploadPdfObject(
  path: string,
  buffer: Buffer,
  metadata: Record<string, string> = {},
): Promise<void> {
  await ensurePdfStorageBucket();
  if (buffer.length <= MIN_PDF_BYTES) throw new Error(`Invalid PDF (${buffer.length} bytes).`);
  if (buffer.length > LARGE_UPLOAD_BYTES) {
    await uploadLargePdf(path, buffer, metadata);
    return;
  }
  const result = await supabaseAdmin.storage.from(PDF_STORAGE_BUCKET).upload(path, buffer, {
    contentType: 'application/pdf',
    cacheControl: '3600',
    upsert: true,
    metadata,
  });
  if (result.error) throw new Error(`Unable to upload PDF: ${result.error.message}`);
}

export async function queueSchoolPdfBuild(schoolId: string): Promise<void> {
  await ensurePdfStorageBucket();
  const path = `${QUEUE_FOLDER}/${sanitize(schoolId)}.json`;
  const result = await supabaseAdmin.storage.from(PDF_STORAGE_BUCKET).upload(
    path,
    Buffer.from(JSON.stringify({ schoolId, queuedAt: new Date().toISOString() })),
    { contentType: 'application/json', cacheControl: '0', upsert: true },
  );
  if (result.error) throw new Error(`Unable to queue PDF build: ${result.error.message}`);
}

export async function getQueuedPdfSchoolIds(): Promise<string[]> {
  await ensurePdfStorageBucket();
  const result = await supabaseAdmin.storage.from(PDF_STORAGE_BUCKET).list(QUEUE_FOLDER, {
    limit: 1_000,
    sortBy: { column: 'created_at', order: 'asc' },
  });
  if (result.error) throw new Error(`Unable to read PDF queue: ${result.error.message}`);
  return (result.data || [])
    .filter((file: any) => file.name.endsWith('.json'))
    .map((file: any) => file.name.slice(0, -5));
}

export async function dequeueSchoolPdfBuild(schoolId: string): Promise<void> {
  await ensurePdfStorageBucket();
  const result = await supabaseAdmin.storage
    .from(PDF_STORAGE_BUCKET)
    .remove([`${QUEUE_FOLDER}/${sanitize(schoolId)}.json`]);
  if (result.error && !/not found/i.test(result.error.message)) throw result.error;
}

interface PdfWorkerLease {
  owner: string;
  expiresAt: string;
}

function isExistingObjectError(error: any): boolean {
  return error?.statusCode === '409'
    || error?.status === 409
    || /already exists|duplicate|resource already exists/i.test(error?.message || '');
}

async function createPdfWorkerLease(lease: PdfWorkerLease): Promise<boolean> {
  const result = await supabaseAdmin.storage.from(PDF_STORAGE_BUCKET).upload(
    WORKER_LEASE_PATH,
    Buffer.from(JSON.stringify(lease)),
    { contentType: 'application/json', cacheControl: '0', upsert: false },
  );
  if (!result.error) return true;
  if (isExistingObjectError(result.error)) return false;
  throw new Error(`Unable to acquire PDF worker lease: ${result.error.message}`);
}

export async function acquirePdfWorkerLease(): Promise<string | null> {
  await ensurePdfStorageBucket();
  const owner = randomUUID();
  const lease = { owner, expiresAt: new Date(Date.now() + WORKER_LEASE_MS).toISOString() };
  if (await createPdfWorkerLease(lease)) return owner;

  const existing = await supabaseAdmin.storage.from(PDF_STORAGE_BUCKET).download(WORKER_LEASE_PATH);
  if (existing.error) {
    if (/not found/i.test(existing.error.message)) return (await createPdfWorkerLease(lease)) ? owner : null;
    throw new Error(`Unable to read PDF worker lease: ${existing.error.message}`);
  }

  try {
    const current = JSON.parse(await existing.data.text()) as PdfWorkerLease;
    if (new Date(current.expiresAt).getTime() > Date.now()) return null;
  } catch {
    // Invalid lease files are treated as stale and replaced below.
  }

  const removed = await supabaseAdmin.storage.from(PDF_STORAGE_BUCKET).remove([WORKER_LEASE_PATH]);
  if (removed.error && !/not found/i.test(removed.error.message)) {
    throw new Error(`Unable to replace stale PDF worker lease: ${removed.error.message}`);
  }
  return (await createPdfWorkerLease(lease)) ? owner : null;
}

export async function releasePdfWorkerLease(owner: string): Promise<void> {
  const existing = await supabaseAdmin.storage.from(PDF_STORAGE_BUCKET).download(WORKER_LEASE_PATH);
  if (existing.error) {
    if (/not found/i.test(existing.error.message)) return;
    throw new Error(`Unable to read PDF worker lease: ${existing.error.message}`);
  }

  try {
    const current = JSON.parse(await existing.data.text()) as PdfWorkerLease;
    if (current.owner !== owner) return;
  } catch {
    return;
  }

  const removed = await supabaseAdmin.storage.from(PDF_STORAGE_BUCKET).remove([WORKER_LEASE_PATH]);
  if (removed.error && !/not found/i.test(removed.error.message)) {
    throw new Error(`Unable to release PDF worker lease: ${removed.error.message}`);
  }
}

export async function isPdfWorkerLeaseActive(): Promise<boolean> {
  await ensurePdfStorageBucket();
  const existing = await supabaseAdmin.storage.from(PDF_STORAGE_BUCKET).download(WORKER_LEASE_PATH);
  if (existing.error) {
    if (/not found/i.test(existing.error.message)) return false;
    throw new Error(`Unable to read PDF worker lease: ${existing.error.message}`);
  }
  try {
    const current = JSON.parse(await existing.data.text()) as PdfWorkerLease;
    return new Date(current.expiresAt).getTime() > Date.now();
  } catch {
    return false;
  }
}

export function getBrowserExecutablePath(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/microsoft-edge', '/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  for (const candidate of candidates) if (fs.existsSync(candidate)) return candidate;
  throw new Error('No compatible Edge or Chrome executable found for local PDF generation.');
}

export function getPdfRenderBaseUrl(): string {
  const configured = process.env.PDF_RENDER_BASE_URL || process.env.CLIENT_URL;
  if (configured) return configured.replace(/\/$/, '');
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  return `http://localhost:${process.env.CLIENT_PORT || process.env.VITE_PORT || '8080'}`;
}

async function browserLaunchOptions() {
  if (process.env.VERCEL) {
    chromium.setGraphicsMode = false;
    return {
      executablePath: await chromium.executablePath(),
      args: await puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' }),
    };
  }
  return {
    executablePath: getBrowserExecutablePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  };
}

export async function launchPdfBrowser(): Promise<Browser> {
  const launch = await browserLaunchOptions();
  return puppeteer.launch({
    executablePath: launch.executablePath,
    headless: process.env.VERCEL ? 'shell' : true,
    args: launch.args,
  });
}

async function preparePdfWatermarks(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const watermarkImages = Array.from(document.querySelectorAll('img')).filter((image) => !image.alt);
    const convertedBySource = new Map<string, string>();

    for (const image of watermarkImages) {
      try {
        let transparentSource = convertedBySource.get(image.src);
        if (!transparentSource) {
          const source = new Image();
          source.crossOrigin = 'anonymous';
          source.src = image.src;
          await source.decode();

          const scale = Math.min(1, 1_000 / Math.max(source.naturalWidth, source.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas is unavailable.');
          context.filter = 'grayscale(100%)';
          context.globalAlpha = 0.03;
          context.drawImage(source, 0, 0, canvas.width, canvas.height);
          transparentSource = canvas.toDataURL('image/png');
          convertedBySource.set(image.src, transparentSource);
        }

        image.src = transparentSource;
        image.style.opacity = '1';
        image.style.filter = 'none';
        await image.decode();
      } catch {
        // Omitting a watermark is safer than rasterizing the entire printed page.
        image.style.display = 'none';
      }
    }
  });
}

async function mergePdfChunks(chunks: Buffer[]): Promise<Buffer> {
  if (chunks.length === 1) return chunks[0];
  const merged = await PDFDocument.create();
  for (const chunk of chunks) {
    const source = await PDFDocument.load(chunk);
    const pages = await merged.copyPages(source, source.getPageIndices());
    for (const page of pages) merged.addPage(page);
  }
  return Buffer.from(await merged.save({ useObjectStreams: true, addDefaultPage: false }));
}

async function renderPdfChunk(browser: Browser, key: PdfKey, offset: number): Promise<{
  buffer: Buffer;
  totalCards: number;
}> {
  const query = new URLSearchParams({
    schoolId: key.schoolId,
    classId: key.classId,
    term: key.term,
    examType: key.examType,
    academicYear: key.academicYear,
    token: createInternalRenderToken(key),
    offset: String(offset),
    limit: String(RENDER_CHUNK_SIZE),
  });
  const page = await browser.newPage();

  try {
    page.setDefaultTimeout(120_000);
    await page.setViewport({ width: 1240, height: 1754 });
    await page.goto(`${getPdfRenderBaseUrl()}/render-class-report-cards?${query}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    await page.waitForSelector('#render-complete, #render-error', { timeout: 60_000 });
    if (await page.$('#render-error')) throw new Error('The report-card render page returned an error.');

    const totalCards = await page.$eval('#render-complete', (element) =>
      Number((element as HTMLElement).dataset.totalCards || '0'),
    );
    if (totalCards <= 0) throw new Error('No report cards were returned for PDF generation.');
    await preparePdfWatermarks(page);
    await page.evaluate(() => document.fonts.ready);
    const bytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      timeout: 90_000,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    });
    console.log(
      `[PdfService] Rendered cards ${offset + 1}-${Math.min(offset + RENDER_CHUNK_SIZE, totalCards)} of ${totalCards}`,
    );
    return { buffer: Buffer.from(bytes), totalCards };
  } finally {
    try { await page.close(); } catch (_) {}
  }
}

export async function generateClassPdf(key: PdfKey, sharedBrowser?: Browser): Promise<string | null> {
  const lockKey = `${key.schoolId}|${key.classId}|${key.term}|${key.examType}|${key.academicYear}`;
  if (pdfInFlight.has(lockKey)) return null;
  pdfInFlight.add(lockKey);
  let browser: Browser | null = sharedBrowser || null;
  const ownsBrowser = !sharedBrowser;
  try {
    pdfWorkerState.currentSchoolId = key.schoolId;
    pdfWorkerState.currentClassId = key.classId;
    pdfWorkerState.currentClassLabel = key.className
      ? `${key.className} (${key.term} - ${key.examType})`
      : `${key.term} - ${key.examType}`;
    pdfWorkerState.isCompiling = true;
    pdfWorkerState.phase = 'rendering';
    pdfWorkerState.startedAt = new Date().toISOString();
    pdfWorkerState.lastError = null;

    if (!browser) browser = await launchPdfBrowser();
    const firstChunk = await renderPdfChunk(browser, key, 0);
    const remainingOffsets: number[] = [];
    for (let offset = RENDER_CHUNK_SIZE; offset < firstChunk.totalCards; offset += RENDER_CHUNK_SIZE) {
      remainingOffsets.push(offset);
    }

    const remainingChunks = new Array<Buffer>(remainingOffsets.length);
    let nextChunkIndex = 0;
    const workers = Array.from(
      { length: Math.min(RENDER_CONCURRENCY, remainingOffsets.length) },
      async () => {
        while (nextChunkIndex < remainingOffsets.length) {
          const chunkIndex = nextChunkIndex++;
          const rendered = await renderPdfChunk(browser!, key, remainingOffsets[chunkIndex]);
          if (rendered.totalCards !== firstChunk.totalCards) {
            throw new Error('Report-card data changed while the PDF was being rendered.');
          }
          remainingChunks[chunkIndex] = rendered.buffer;
        }
      },
    );
    await Promise.all(workers);

    const buffer = await mergePdfChunks([firstChunk.buffer, ...remainingChunks]);
    pdfWorkerState.phase = 'uploading';
    pdfWorkerState.totalBytes = buffer.length;
    const objectPath = getPdfStorageObjectPath(key);
    await uploadPdfObject(objectPath, buffer, {
      schoolId: key.schoolId,
      classId: key.classId,
      term: key.term,
      examType: key.examType,
      academicYear: key.academicYear,
    });
    if (!(await isClassPdfReady(key))) throw new Error('Storage did not confirm the uploaded PDF.');
    return objectPath;
  } catch (error: any) {
    pdfWorkerState.phase = 'failed';
    pdfWorkerState.lastError = error.message || 'Unknown PDF generation error';
    pdfWorkerState.lastErrorAt = new Date().toISOString();
    console.error(`[PdfService] PDF generation failed for ${lockKey}:`, pdfWorkerState.lastError);
    throw error;
  } finally {
    if (ownsBrowser && browser) try { await browser.close(); } catch (_) {}
    pdfWorkerState.isCompiling = false;
    pdfWorkerState.currentSchoolId = null;
    pdfWorkerState.currentClassId = null;
    pdfWorkerState.currentClassLabel = null;
    pdfWorkerState.startedAt = null;
    pdfWorkerState.bytesUploaded = 0;
    pdfWorkerState.totalBytes = 0;
    if (pdfWorkerState.phase !== 'failed') pdfWorkerState.phase = 'idle';
    pdfInFlight.delete(lockKey);
  }
}

/**
 * Packages all pre-compiled class PDFs for a given school, term, and year into a ZIP archive.
 */
export async function generateAllClassesZip(
  schoolId: string,
  term: string,
  academicYear: string
): Promise<{ buffer: Buffer; filename: string; count: number }> {
  await ensurePdfStorageBucket();

  const folder = sanitize(schoolId);
  const { data: files, error: listError } = await supabaseAdmin.storage
    .from(PDF_STORAGE_BUCKET)
    .list(folder, { limit: 1000 });

  if (listError) {
    throw new Error(`Unable to list PDFs from storage: ${listError.message}`);
  }

  const { data: classes } = await supabaseAdmin
    .from('classes')
    .select('id, name')
    .eq('school_id', schoolId);

  const classNameMap = new Map<string, string>((classes || []).map((c: any) => [c.id, String(c.name || 'Class')]));

  const safeTerm = sanitize(term);
  const safeYear = sanitize(academicYear);

  const matchingFiles = (files || []).filter((file: any) => {
    if (!file.name.endsWith('.pdf') || storedFileSize(file) <= MIN_PDF_BYTES) return false;
    // Expected pattern: {classId}_{term}_{examType}_{academicYear}.pdf
    return file.name.includes(`_${safeTerm}_`) && file.name.includes(`_${safeYear}.pdf`);
  });

  if (matchingFiles.length === 0) {
    throw new Error(`No pre-compiled class PDFs found ready for ${term} ${academicYear}.`);
  }

  const zip = new JSZip();
  let count = 0;
  const seenClassNames = new Set<string>();

  for (const file of matchingFiles) {
    try {
      const { data, error: downloadError } = await supabaseAdmin.storage
        .from(PDF_STORAGE_BUCKET)
        .download(`${folder}/${file.name}`);

      if (downloadError || !data) {
        console.warn(`[ZipExport] Failed to download ${file.name}:`, downloadError?.message);
        continue;
      }

      const arrayBuf = await data.arrayBuffer();

      // Extract class ID and resolve human-friendly name
      const parts = file.name.replace(/\.pdf$/, '').split('_');
      const classId = parts[0];
      const rawClassName = classNameMap.get(classId) || 'Class';
      let cleanClassName = rawClassName.replace(/[^a-zA-Z0-9_-]/g, '_');

      if (seenClassNames.has(cleanClassName)) {
        // If multiple PDFs for same class (e.g. Mid Term and End of Term), disambiguate
        const examType = parts[2] || '';
        cleanClassName = `${cleanClassName}_${examType}`;
      }
      seenClassNames.add(cleanClassName);

      const entryFilename = `${cleanClassName}_${term.replace(/\s+/g, '_')}_${academicYear}_ReportCards.pdf`;
      zip.file(entryFilename, Buffer.from(arrayBuf));
      count++;
    } catch (err: any) {
      console.warn(`[ZipExport] Error packaging ${file.name}:`, err.message);
    }
  }

  if (count === 0) {
    throw new Error(`Failed to package any valid PDF files for ${term} ${academicYear}.`);
  }

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const zipFilename = `Report_Cards_All_Classes_${term.replace(/\s+/g, '_')}_${academicYear}.zip`;
  return { buffer, filename: zipFilename, count };
}
