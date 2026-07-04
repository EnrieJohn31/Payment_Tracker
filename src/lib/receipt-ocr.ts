import TextRecognition from '@react-native-ml-kit/text-recognition';
import { NativeModules } from 'react-native';

import { scanReceiptInCloud } from '@/lib/receipt-ocr-cloud';
import { parseReceipt, type ScanResult } from '@/lib/receipt-parser';

export type { ScannedItem, ScanResult } from '@/lib/receipt-parser';

/** ML Kit is a native module, so it is missing inside Expo Go. */
function isNativeOcrAvailable(): boolean {
  return NativeModules.TextRecognition != null;
}

/**
 * Reads the receipt photo with on-device ML Kit when available (development
 * build), otherwise falls back to the free OCR.space web API so scanning
 * still works inside Expo Go (needs internet).
 */
export async function scanReceipt(imageUri: string): Promise<ScanResult> {
  if (isNativeOcrAvailable()) {
    const result = await TextRecognition.recognize(imageUri);
    return parseReceipt(result);
  }
  return scanReceiptInCloud(imageUri);
}
