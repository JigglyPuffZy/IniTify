const { processArticle } = require('./ai-processor');
const repository = require('./repository');

const MAX_RETRIES = 5;

/** Re-process rows where AI failed — no manual data entry */
async function retryFailedProcessing() {
  const supabase = require('../supabase').getSupabaseAdmin();
  const { data, error } = await supabase
    .from('pagasa_updates')
    .select('*')
    .eq('ai_processing_status', 'failed')
    .order('collected_at', { ascending: true })
    .limit(20);

  if (error) throw new Error(error.message);
  if (!data?.length) return { retried: 0, succeeded: 0 };

  let succeeded = 0;
  for (const row of data) {
    const processed = await processArticle({
      title: row.title,
      content: row.original_content,
      sourceUrl: row.source_url,
      publishedAt: row.published_at,
    });

    if (processed.aiProcessingStatus === 'failed') continue;

    await repository.updateById(row.id, {
      ai_summary: processed.aiSummary,
      category: processed.category,
      affected_locations: processed.affectedLocations,
      severity: processed.severity,
      ai_processing_status: processed.aiProcessingStatus,
      status: 'approved',
    });
    succeeded += 1;
  }

  return { retried: data.length, succeeded };
}

module.exports = { retryFailedProcessing, MAX_RETRIES };
