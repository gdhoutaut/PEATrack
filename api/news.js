export default async function handler(req, res) {
  const INDICES = [
    { key: 'sp500',    label: 'S&P 500',              query: 'S%26P+500',           etf: 'ESEE' },
    { key: 'msciworld',label: 'MSCI World',            query: 'MSCI+World',          etf: 'AE57' },
    { key: 'stoxx600', label: 'STOXX Europe 600',      query: 'STOXX+Europe+600',    etf: 'ETSZ' },
    { key: 'emerging', label: 'MSCI Emerging Markets', query: 'MSCI+Emerging+Markets',etf: '18MH' },
  ];

  const results = await Promise.allSettled(
    INDICES.map(async idx => {
      const url = `https://news.google.com/rss/search?q=${idx.query}&hl=fr&gl=FR&ceid=FR:fr`;
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(6000),
      });
      const xml = await r.text();

      // Parse items from RSS XML
      const items = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemRegex.exec(xml)) !== null && items.length < 4) {
        const block = match[1];
        const title  = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/))?.[1] ?? '';
        const link   = (block.match(/<link>(.*?)<\/link>/))?.[1] ?? '';
        const pubDate= (block.match(/<pubDate>(.*?)<\/pubDate>/))?.[1] ?? '';
        const source = (block.match(/<source[^>]*>(.*?)<\/source>/) || [])?.[1] ?? '';
        if (title && link) items.push({ title: title.trim(), link: link.trim(), pubDate, source: source.trim() });
      }

      return { ...idx, items };
    })
  );

  const news = results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { ...INDICES[i], items: [] }
  );

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=1800'); // cache 30min côté Vercel
  res.status(200).json({ news });
}
