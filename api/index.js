export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  res.statusCode = 200;
  return res.end(
    JSON.stringify(
      {
        name: 'API Sistem Surat & Database PT Nirwana Bhumi Energi (NBE)',
        version: '1.0.0',
        status: 'active',
        endpoints: [
          {
            path: '/api/receive_data',
            method: 'POST',
            description: 'REST API Penerimaan Data Satu Arah (NBE Secured)',
            authRequired: true,
            header: 'X-API-KEY: DRX-998877-SEC',
          },
          {
            path: '/api/receive_data',
            method: 'GET',
            description: 'Dokumentasi & Healthcheck Endpoint receive_data',
            authRequired: false,
          },
        ],
        cloudSyncWebhookUrl:
          'https://script.google.com/macros/s/AKfycbweEADkAMfpyBXO4j1dBqPTACdrjkR5Pke90h9YxNRGchvA25xP_6JKXHl8e5LPd6bT/exec',
        documentationUrl: 'https://nbe-surat-system.vercel.app/',
      },
      null,
      2
    )
  );
}
