const Parser = require('rss-parser');
const sources = require('./sources');
const { contentHash } = require('./hash');
const { processArticle } = require('./ai-processor');
const { fetchOfficialPage, isOfficialPagasaUrl } = require('./page-fetcher');
const { fetchHtmlListing } = require('./html-list-fetcher');
const repository = require('./repository');

const parser = new Parser({
  timeout: 20000,
  headers: { 'User-Agent': 'IniTify-PAGASA-News-Collector/1.0 (+thesis research)' },
});

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Auto-publish when content is from an official source — no manual news entry */
function resolveStatus(processed, hasValidSource) {
  if (!hasValidSource) return 'failed';
  if (process.env.PAGASA_NEWS_REQUIRE_ADMIN_APPROVE === 'true') {
    return processed.aiProcessingStatus === 'completed' ? 'approved' : 'pending';
  }
  return 'approved';
}

async function extractOfficialContent(item) {
  if (!isOfficialPagasaUrl(item.sourceUrl)) {
    return { ok: false, content: '', message: 'Non-official URL blocked' };
  }

  const page = await fetchOfficialPage(item.sourceUrl);
  if (page.ok && page.content.length >= 40) {
    return { ok: true, content: page.content, message: page.message };
  }

  const rssFallback = stripHtml(item.rssSnippet || '');
  if (rssFallback.length >= 40) {
    return {
      ok: true,
      content: rssFallback,
      message: `RSS excerpt used; page fetch: ${page.message}`,
    };
  }

  return { ok: false, content: '', message: page.message || 'No readable official content' };
}

async function fetchRssSource(source) {
  const feed = await parser.parseURL(source.url);
  return (feed.items || []).map((item) => {
    const rssSnippet = stripHtml(item.contentSnippet || item.content || item.summary || '');
    const link = item.link || item.guid || `${source.baseUrl}/#${encodeURIComponent(item.title || '')}`;
    return {
      title: (item.title || 'DOST-PAGASA Update').trim(),
      rssSnippet,
      sourceUrl: link,
      publishedAt: parseDate(item.isoDate || item.pubDate),
      sourceName: source.name,
      sourceId: source.id,
    };
  });
}

async function fetchSourceItems(source) {
  if (source.type === 'html_list') {
    return fetchHtmlListing(source);
  }
  return fetchRssSource(source);
}

async function collectFromSource(source) {
  const startedAt = new Date().toISOString();
  let itemsFound = 0;
  let itemsNew = 0;
  let itemsSkipped = 0;
  let errorMessage = null;

  try {
    const items = await fetchSourceItems(source);
    itemsFound = items.length;

    for (const item of items) {
      try {
        if (!item.sourceUrl || !item.title) {
          itemsSkipped += 1;
          continue;
        }

        const extracted = await extractOfficialContent(item);
        if (!extracted.ok) {
          itemsSkipped += 1;
          continue;
        }

        const fullContent = extracted.content;
        const hash = contentHash(item.title, fullContent);
        const [existingHash, existingUrl] = await Promise.all([
          repository.findByHash(hash),
          repository.findByUrl(item.sourceUrl),
        ]);
        if (existingHash || existingUrl) {
          itemsSkipped += 1;
          continue;
        }

        const processed = await processArticle({
          ...item,
          content: fullContent,
          pageFetched: true,
        });

        const status = resolveStatus(processed, true);

        await repository.insertUpdate({
          title: item.title.slice(0, 500),
          original_content: fullContent,
          ai_summary: processed.aiSummary,
          category: processed.category,
          source_name: item.sourceName,
          source_url: item.sourceUrl,
          published_at: item.publishedAt,
          collected_at: new Date().toISOString(),
          affected_locations: processed.affectedLocations,
          severity: processed.severity,
          status,
          content_hash: hash,
          is_important: processed.severity === 'high' || processed.severity === 'critical',
          ai_processing_status: processed.aiProcessingStatus,
        });
        itemsNew += 1;
      } catch (itemErr) {
        itemsSkipped += 1;
        errorMessage = itemErr.message;
        console.warn(`[pagasa-news] Skip item (${item.sourceUrl}):`, itemErr.message);
      }
    }

    await repository.logCollection({
      source_id: source.id,
      source_name: source.name,
      source_url: source.url,
      run_status: errorMessage && itemsNew === 0 ? 'partial' : 'success',
      items_found: itemsFound,
      items_new: itemsNew,
      error_message: errorMessage || (itemsSkipped ? `${itemsSkipped} skipped (duplicate/unreadable)` : null),
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });

    return {
      source: source.id,
      itemsFound,
      itemsNew,
      itemsSkipped,
      status: itemsNew > 0 || !errorMessage ? 'success' : 'partial',
      error: errorMessage || undefined,
    };
  } catch (err) {
    errorMessage = err.message;
    await repository.logCollection({
      source_id: source.id,
      source_name: source.name,
      source_url: source.url,
      run_status: 'failed',
      items_found: itemsFound,
      items_new: itemsNew,
      error_message: errorMessage,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });
    return { source: source.id, itemsFound, itemsNew, status: 'failed', error: errorMessage };
  }
}

async function runCollectionCycle() {
  const results = [];
  for (const source of sources) {
    results.push(await collectFromSource(source));
  }
  return results;
}

module.exports = { runCollectionCycle, collectFromSource, resolveStatus };
