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

const readWithBarcodeDetector = async (file: File) => {
  if (!window.BarcodeDetector) return '';

  const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
  const bitmap = await createImageBitmap(file);

  try {
    const barcodes = await detector.detect(bitmap);
    const rawText = barcodes.map((barcode) => barcode.rawValue || '').join('\n');
    return findCccd(rawText);
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

  return qrCode?.data ? findCccd(qrCode.data) : '';
};

export async function extractCccdFromImage(file: File) {
  const cccd = await readWithBarcodeDetector(file) || await readWithCanvas(file);

  if (!cccd) {
    throw new Error('Không tìm thấy số CCCD trong QR. Vui lòng chụp rõ mặt trước CCCD, đặc biệt phần mã QR.');
  }

  return cccd;
}
