function parseReceiptText(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  let parsedAmount = null;
  let parsedDate = null;
  let parsedVendor = lines[0]?.slice(0, 80) || null;

  const amountMatch =
    text.match(/(?:total|amount|due|balance)[:\s]*\$?\s*(\d+[.,]\d{2})/i) ||
    text.match(/\$\s*(\d+[.,]\d{2})/);
  if (amountMatch) {
    parsedAmount = parseFloat(amountMatch[1].replace(',', '.'));
  }

  const dateMatch = text.match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/);
  if (dateMatch) parsedDate = dateMatch[1];

  const garageLine = lines.find((l) => /garage|auto|service|repair|oil|lube/i.test(l));
  if (garageLine) parsedVendor = garageLine.slice(0, 80);

  return { parsedAmount, parsedDate, parsedVendor };
}

async function extractTextFromBuffer(buffer, mimeType) {
  if (mimeType === 'application/pdf') {
    const pdfParse = (await import('pdf-parse')).default;
    const pdf = await pdfParse(buffer);
    return { text: pdf.text || '', confidence: 0.85 };
  }

  if (mimeType?.startsWith('image/')) {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', undefined, { logger: () => {} });
    try {
      const { data } = await worker.recognize(buffer);
      return { text: data.text || '', confidence: (data.confidence || 50) / 100 };
    } finally {
      await worker.terminate().catch(() => {});
    }
  }

  return { text: '', confidence: 0 };
}

/** @deprecated use runOcrOnBuffer */
export async function runOcrOnDocument(document, uploadDir) {
  const { readUploadBuffer, BUCKETS } = await import('./storage.js');
  const buffer = await readUploadBuffer(BUCKETS.documents, document.filePath);
  return runOcrOnBuffer(buffer, document.fileType);
}

export async function runOcrOnBuffer(buffer, mimeType) {
  const { text, confidence } = await extractTextFromBuffer(buffer, mimeType);
  const parsed = parseReceiptText(text);

  return {
    extractedText: text.slice(0, 8000),
    confidenceScore: Math.min(1, Math.max(0, confidence)),
    ...parsed,
  };
}
