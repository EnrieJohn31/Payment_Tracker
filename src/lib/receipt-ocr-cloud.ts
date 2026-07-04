import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import {
  parseOcrSpaceResponse,
  type OcrSpaceResponse,
  type ScanResult,
} from '@/lib/receipt-parser';

/**
 * Free OCR.space API used as a fallback when the app runs inside Expo Go,
 * where the on-device ML Kit module is unavailable. 'helloworld' is the
 * public demo key and is heavily rate limited — get a free personal key
 * (25,000 scans/month) at https://ocr.space/ocrapi and paste it here.
 */
const OCR_SPACE_API_KEY = 'helloworld';
const OCR_SPACE_URL = 'https://api.ocr.space/parse/image';

/** OCR.space rejects files over ~1 MB, so shrink the photo before uploading. */
async function shrinkPhoto(uri: string): Promise<string> {
  const image = await ImageManipulator.manipulate(uri).resize({ width: 1080 }).renderAsync();
  const saved = await image.saveAsync({ compress: 0.6, format: SaveFormat.JPEG });
  return saved.uri;
}

export async function scanReceiptInCloud(imageUri: string): Promise<ScanResult> {
  const uploadUri = await shrinkPhoto(imageUri);

  const form = new FormData();
  // React Native FormData accepts { uri, name, type } file descriptors.
  form.append('file', {
    uri: uploadUri,
    name: 'receipt.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);
  form.append('OCREngine', '2');
  form.append('isOverlayRequired', 'true');
  form.append('scale', 'true');
  form.append('detectOrientation', 'true');

  const response = await fetch(OCR_SPACE_URL, {
    method: 'POST',
    headers: { apikey: OCR_SPACE_API_KEY },
    body: form,
  });
  if (!response.ok) {
    throw new Error(`OCR request failed with status ${response.status}`);
  }

  const json = (await response.json()) as OcrSpaceResponse;
  if (json.IsErroredOnProcessing) {
    const message = Array.isArray(json.ErrorMessage)
      ? json.ErrorMessage.join('; ')
      : (json.ErrorMessage ?? 'unknown OCR error');
    throw new Error(message);
  }

  return parseOcrSpaceResponse(json);
}
