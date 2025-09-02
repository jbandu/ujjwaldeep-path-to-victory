import QRCode from 'qrcode';

export interface QRPayload {
  test_id: string;
  version: number;
  layout_hash?: string;
  page?: number;
  start_q?: number;
}

export async function generateQRCode(payload: QRPayload): Promise<string> {
  try {
    const dataString = JSON.stringify(payload);
    const qrCodeDataUrl = await QRCode.toDataURL(dataString, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

export function parseQRCode(dataString: string): QRPayload | null {
  try {
    const payload = JSON.parse(dataString) as QRPayload;
    
    // Validate required fields
    if (!payload.test_id || typeof payload.version !== 'number') {
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error('Error parsing QR code:', error);
    return null;
  }
}

export function generateLayoutHash(questions: any[]): string {
  // Generate a simple hash based on question order and structure
  const questionIds = questions.map(q => q.id).join(',');
  return btoa(questionIds).slice(0, 16);
}