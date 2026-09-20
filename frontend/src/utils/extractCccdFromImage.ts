import jsQR from 'jsqr';

interface DetectedBarcode {
  rawValue?: string;
}

interface BarcodeDetectorConstructor {
  new(options?: { formats?: string[] }): {
    detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
  };
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

const findCccd = (text: string) => {
  const qrFirstField = text.match(/^(\d{12})(?:\||$)/);
  if (qrFirstField) return qrFirstField[1];

  return text.replace(/\D/g, '').match(/\d{12}/)?.[0] || '';
};

export interface CccdQrData {
  cccd: string;
  address: string;
}

export const parseCccdQr = (rawText: string): CccdQrData => {
  const text = rawText.trim();
  const fields = text.split('|').map((field) => field.trim());
  const cccd = findCccd(text);
  const address = fields[0] === cccd && fields.length >= 6
    ? fields[5].replace(/\s+/g, ' ').trim()
    : '';
  return { cccd, address: address.length >= 8 && address.length <= 500 ? address : '' };
};

const readWithBarcodeDetector = async (file: File) => {
  if (!window.BarcodeDetector) return { cccd: '', address: '' };

  const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
  const bitmap = await createImageBitmap(file);

  try {
    const barcodes = await detector.detect(bitmap);
    return barcodes.map((barcode) => parseCccdQr(barcode.rawValue || ''))
      .find((item) => item.cccd) || { cccd: '', address: '' };
  } finally {
    bitmap.close();
  }
};

const readWithCanvas = async (file: File) => {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    bitmap.close();
    throw new Error('Không thể xử lý ảnh trên trình duyệt này.');
  }

  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

  return qrCode?.data ? parseCccdQr(qrCode.data) : { cccd: '', address: '' };
};

export async function extractCccdFromImage(file: File) {
  let detected: CccdQrData = { cccd: '', address: '' };
  try {
    detected = await readWithBarcodeDetector(file);
  } catch {
    // BarcodeDetector is not consistently supported; jsQR remains the fallback.
  }
  const result = detected.cccd ? detected : await readWithCanvas(file);

  if (!result.cccd) {
    throw new Error('Không tìm thấy số CCCD trong QR. Vui lòng chụp rõ mặt trước CCCD, đặc biệt phần mã QR.');
  }

  return result;
}
