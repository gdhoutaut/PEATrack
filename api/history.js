export default async function handler(req, res) {
  const { ticker, from, interval } = req.query;
  if (!ticker || !from) return res.status(400).json({ error: 'Missing ticker or from' });

  const fromTs = Math.floor(new Date(from).getTime() / 1000);
  const toTs   = Math.floor(Date.now() / 1000);
  const iv     = interval || '1wk';

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${iv}&period1=${fromTs}&period2=${toTs}`;

  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });
    const data = await r.json();
    const result = data?.chart?.result?.[0];
    if (!result) return res.status(404).json({ error: 'No data' });

    const timestamps = result.timestamp || [];
    const closes     = result.indicators?.quote?.[0]?.close || [];

    // Return array of { date, close } filtering out nulls
    const isIntraday = iv === '5m' || iv === '1m' || iv === '15m' || iv === '30m' || iv === '60m';
    const points = timestamps
      .map((ts, i) => ({
        date:  isIntraday
          ? new Date(ts * 1000).toISOString()   // full ISO for intraday
          : new Date(ts * 1000).toISOString().split('T')[0],
        close: closes[i]
      }))
      .filter(p => p.close != null);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ ticker, points });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
