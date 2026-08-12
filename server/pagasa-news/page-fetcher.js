const cheerio = require('cheerio');

const ALLOWED_HOSTS = [
  'www.pagasa.dost.gov.ph',
  'pagasa.dost.gov.ph',
  'bagong.pagasa.dost.gov.ph',
  'pubfiles.pagasa.dost.gov.ph',
];

function isOfficialPagasaUrl(urlString) {
  try {
    const url = new URL(urlString);
    return ALLOWED_HOSTS.includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function extractReadableText(html) {
  const $ = cheerio.load(html);
  $('script, style, nav, footer, header, iframe, noscript').remove();

  const candidates = [
    $('article').text(),
    $('.item-page').text(),
    $('.article-content').text(),
    $('.content').text(),
    $('main').text(),
    $('#content').text(),
    $('body').text(),
  ];

  for (const block of candidates) {
    const text = (block || '').replace(/\s+/g, ' ').trim();
    if (text.length >= 120) return text.slice(0, 15000);
  }

  return $('body').text().replace(/\s+/g, ' ').trim().slice(0, 15000);
}

/**
 * Opens each official DOST-PAGASA publication URL and extracts page text for AI.
 * Only pagasa.dost.gov.ph domains are allowed.
 */
async function fetchOfficialPage(sourceUrl) {
  if (!isOfficialPagasaUrl(sourceUrl)) {
    return {
      ok: false,
      content: '',
      message: `Blocked non-official URL: ${sourceUrl}`,
    };
  }

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'IniTify-PAGASA-News-Collector/1.0 (+thesis research)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      return {
        ok: false,
        content: '',
        message: `Page fetch failed (${response.status}): ${sourceUrl}`,
      };
    }

    const html = await response.text();
    const content = extractReadableText(html);

    if (content.length < 40) {
      return {
        ok: false,
        content: '',
        message: `Page had insufficient readable text: ${sourceUrl}`,
      };
    }

    return {
      ok: true,
      content,
      message: `Retrieved official page content from ${sourceUrl}`,
      fetchedFromUrl: sourceUrl,
    };
  } catch (err) {
    return {
      ok: false,
      content: '',
      message: `Could not reach official page: ${err.message}`,
    };
  }
}

module.exports = { fetchOfficialPage, isOfficialPagasaUrl };
