export default async function handler(req, res) {
  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: 'Missing ticker' });

  // Fetch 5 days of daily data to reliably get yesterday's close
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5d`;

  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });
    const data = await r.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) return res.status(404).json({ error: 'No data' });

    const price = meta.regularMarketPrice ?? meta.previousClose;

    // Extract previous close from OHLC closes array (second-to-last trading day)
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    const validCloses = closes.filter(v => v != null);
    // previousClose = last completed session close (not today's intraday)
    // If market is open today, prev = validCloses[last], else validCloses[second-to-last]
    let prev = meta.previousClose;
    if (validCloses.length >= 2) {
      // The last entry may be today's intraday — use the one before
      const marketOpen = meta.marketState === 'REGULAR' || meta.marketState === 'PRE';
      prev = marketOpen ? validCloses[validCloses.length - 2] : validCloses[validCloses.length - 1];
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ price, prev });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
