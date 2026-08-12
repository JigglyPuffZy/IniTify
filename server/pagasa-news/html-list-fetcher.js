const cheerio = require('cheerio');

const USER_AGENT = 'IniTify-PAGASA-News-Collector/1.0 (+thesis research)';

function absoluteUrl(baseUrl, href) {
  if (!href) return null;
  if (href.startsWith('http')) return href;
  return new URL(href, baseUrl).toString();
}

function parsePhDate(text) {
  const match = (text || '').match(/(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})/);
  if (!match) return null;
  const d = new Date(`${match[2]} ${match[1]}, ${match[3]}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Scrape official DOST-PAGASA listing pages (press releases, articles).
 * Used when legacy Joomla RSS endpoints are unavailable.
 */
async function fetchHtmlListing(source) {
  const response = await fetch(source.url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`Listing page HTTP ${response.status}: ${source.url}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const pattern = source.linkPattern || /press-release|article/;
  const seen = new Set();
  const items = [];

  $('a[href]').each((_i, el) => {
    const href = $(el).attr('href');
    if (!href || !pattern.test(href)) return;

    const sourceUrl = absoluteUrl(source.baseUrl, href);
    if (!sourceUrl || seen.has(sourceUrl)) return;

    const title = $(el).text().replace(/\s+/g, ' ').trim();
    if (title.length < 12) return;

    seen.add(sourceUrl);

    const parentText = $(el).parent().parent().text().replace(/\s+/g, ' ');
    const publishedAt = parsePhDate(parentText) || parsePhDate($(el).closest('article, .card, li, div').text());

    items.push({
      title: title.slice(0, 500),
      rssSnippet: '',
      sourceUrl,
      publishedAt,
      sourceName: source.name,
      sourceId: source.id,
    });
  });

  return items.slice(0, 40);
}

module.exports = { fetchHtmlListing, parsePhDate };
