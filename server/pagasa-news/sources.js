/**
 * Official DOST-PAGASA sources — inspected Aug 2026
 *
 * Legacy Joomla RSS (/feed/rss/1) returns 404 on www.pagasa.dost.gov.ph.
 * Primary method: scrape official listing pages, then open each publication URL.
 * Optional RSS on bagong.pagasa.dost.gov.ph (may be malformed — treated as fallback).
 */
module.exports = [
  {
    id: 'pagasa-press-releases',
    name: 'DOST-PAGASA Press Releases',
    type: 'html_list',
    url: 'https://www.pagasa.dost.gov.ph/press-release/',
    baseUrl: 'https://www.pagasa.dost.gov.ph',
    linkPattern: /press-release\/\d+/i,
  },
  {
    id: 'pagasa-articles',
    name: 'DOST-PAGASA Articles',
    type: 'html_list',
    url: 'https://www.pagasa.dost.gov.ph/article/',
    baseUrl: 'https://www.pagasa.dost.gov.ph',
    linkPattern: /article\/\d+/i,
  },
  {
    id: 'pagasa-home-featured',
    name: 'DOST-PAGASA Homepage',
    type: 'html_list',
    url: 'https://www.pagasa.dost.gov.ph/',
    baseUrl: 'https://www.pagasa.dost.gov.ph',
    linkPattern: /\/(press-release|article)\/\d+/i,
  },
];
