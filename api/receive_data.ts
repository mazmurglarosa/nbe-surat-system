import type { IncomingMessage, ServerResponse } from 'http';

const VALID_API_KEY = process.env.API_KEY || 'DRX-998877-SEC';

interface ExtendedRequest extends IncomingMessage {
  body?: any;
  query?: Record<string, string>;
  headers: Record<string, string | string[] | undefined>;
}

interface ExtendedResponse extends ServerResponse {
  status: (statusCode: number) => ExtendedResponse;
  json: (data: any) => void;
}

// Helper untuk membaca body jika belum terurai otomatis oleh runtime Vercel
async function parseBody(req: ExtendedRequest): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
  });
}

export default async function handler(req: ExtendedRequest, res: ExtendedResponse) {
  // 1. Header CORS Baku
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, API-KEY, X-API-KEY, Authorization');

  // 2. Preflight OPTIONS
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  // 3. GET Method: Dokumentasi & Healthcheck Endpoint
  if (req.method === 'GET') {
    res.statusCode = 200;
    return res.end(
      JSON.stringify(
        {
          status: 'online',
          service: 'REST API Penerimaan Data PT Nirwana Bhumi Energi (NBE)',
          endpoint: '/api/receive_data',
          method: 'POST',
          headersRequired: {
            'Content-Type': 'application/json',
            'X-API-KEY': 'DRX-998877-SEC',
          },
          payloadExample: {
            nama: 'Nama Lengkap Direksi / Dokumen',
            tanggal: '2026-10-14',
            keterangan: 'Keterangan atau perihal dokumen',
          },
          curlExample: `curl -X POST https://nbe-surat-system.vercel.app/api/receive_data -H "Content-Type: application/json" -H "X-API-KEY: DRX-998877-SEC" -d "{\\"nama\\":\\"Mazmur Gusti\\",\\"tanggal\\":\\"2026-10-14\\",\\"keterangan\\":\\"Uji Coba API\\"}"`,
        },
        null,
        2
      )
    );
  }

  // 4. Validasi HTTP Method (Wajib POST)
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(
      JSON.stringify({
        status: 'error',
        code: 405,
        pesan: 'Metode request tidak diizinkan. Gunakan metode POST.',
      })
    );
  }

  // 5. Validasi API Key
  const apiKeyHeader =
    req.headers['x-api-key'] ||
    req.headers['api-key'] ||
    req.headers['authorization'];

  const cleanApiKey = Array.isArray(apiKeyHeader)
    ? apiKeyHeader[0]
    : apiKeyHeader ? String(apiKeyHeader).replace(/^Bearer\s+/i, '').trim() : '';

  if (!cleanApiKey || cleanApiKey !== VALID_API_KEY) {
    res.statusCode = 401;
    return res.end(
      JSON.stringify({
        status: 'error',
        code: 401,
        pesan: 'Unauthorized: API-KEY tidak valid atau tidak ditemukan dalam HTTP Headers.',
      })
    );
  }

  // 6. Parsing & Validasi Payload
  const body = await parseBody(req);
  const nama = typeof body.nama === 'string' ? body.nama.trim() : '';
  const tanggal = typeof body.tanggal === 'string' ? body.tanggal.trim() : '';
  const keterangan = typeof body.keterangan === 'string' ? body.keterangan.trim() : '';

  const errors: string[] = [];
  if (!nama) {
    errors[] = "Parameter 'nama' wajib diisi.";
  }
  if (!tanggal) {
    errors[] = "Parameter 'tanggal' wajib diisi (format: YYYY-MM-DD).";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    errors[] = "Format 'tanggal' tidak valid. Gunakan format YYYY-MM-DD (contoh: 2026-10-14).";
  }

  if (errors.length > 0) {
    res.statusCode = 400;
    return res.end(
      JSON.stringify({
        status: 'error',
        code: 400,
        pesan: 'Validasi input gagal.',
        detail: errors,
      })
    );
  }

  // 7. Simpan / Teruskan data
  const simulatedId = Date.now();
  const waktuSimpan = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // Jika Webhook Bot Google Apps Script tersedia, teruskan juga ke cloud database
  const webhookUrl = process.env.VITE_BOT_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbweEADkAMfpyBXO4j1dBqPTACdrjkR5Pke90h9YxNRGchvA25xP_6JKXHl8e5LPd6bT/exec';
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'api_receive_data',
          nama,
          tanggal,
          keterangan,
          createdAt: waktuSimpan,
        }),
      }).catch(() => null);
    } catch {
      // Tidak menghambat response utama
    }
  }

  // 8. Kembalikan Response Sukses Baku (HTTP 201 Created)
  res.statusCode = 201;
  return res.end(
    JSON.stringify(
      {
        status: 'sukses',
        code: 201,
        pesan: 'Data berhasil diterima dan diproses oleh REST API Vercel NBE.',
        data: {
          id: simulatedId,
          nama,
          tanggal,
          keterangan: keterangan || null,
          waktu_simpan: waktuSimpan,
        },
      },
      null,
      2
    )
  );
}
