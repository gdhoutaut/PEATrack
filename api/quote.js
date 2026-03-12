export default async function handler(req, res) {
  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: 'Missing ticker' });

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2d`;

  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });
    const data = await r.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return res.status(404).json({ error: 'No data' });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({
      price: meta.regularMarketPrice ?? meta.previousClose,
      prev: meta.previousClose,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
