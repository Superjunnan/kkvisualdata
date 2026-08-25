const allowedAdcodes = new Set([
  '310000', '320000', '330000', '340000', '350000', '370000', '420000', '430000', '440000', '450000', '460000', '500000', '510000', '520000',
  '320100', '320200', '320400', '320500', '320600', '321100', '330100', '330200', '330600', '330700', '340100', '350100', '350200', '350300', '350500',
  '370200', '420100', '430100', '440100', '440300', '440600', '441200', '441900', '442000', '450100', '460100', '510100', '520100',
]);

export async function GET(request: Request) {
  const adcode = new URL(request.url).searchParams.get('adcode') ?? '';
  if (!allowedAdcodes.has(adcode)) return Response.json({ error: '不支持的行政区划代码' }, { status: 400 });

  const candidates = [
    `https://geo.datav.aliyun.com/areas_v3/bound/${adcode}_full.json`,
    `https://geo.datav.aliyun.com/areas_v3/bound/${adcode}.json`,
  ];

  for (const source of candidates) {
    const response = await fetch(source, { headers: { accept: 'application/json' } });
    if (!response.ok) continue;
    return new Response(await response.text(), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=604800, stale-while-revalidate=2592000',
      },
    });
  }

  return Response.json({ error: '行政边界数据暂时不可用' }, { status: 502 });
}
