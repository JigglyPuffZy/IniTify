const { getSupabaseAdmin } = require('../supabase');

/** Promote legacy pending rows from official sources — no manual approval needed */
async function autoApprovePendingOfficial() {
  if (process.env.PAGASA_NEWS_REQUIRE_ADMIN_APPROVE === 'true') {
    return { promoted: 0 };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('pagasa_updates')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('status', 'pending')
    .select('id');

  if (error) throw new Error(error.message);
  return { promoted: data?.length || 0 };
}

module.exports = { autoApprovePendingOfficial };
