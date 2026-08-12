const { getSupabaseAdmin } = require('../supabase');

async function findByHash(contentHash) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('pagasa_updates')
    .select('id')
    .eq('content_hash', contentHash)
    .maybeSingle();
  return data;
}

async function findByUrl(sourceUrl) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('pagasa_updates')
    .select('id')
    .eq('source_url', sourceUrl)
    .maybeSingle();
  return data;
}

async function insertUpdate(row) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('pagasa_updates').insert(row).select('id').single();
  if (error) {
    if (error.code === '23505') return { inserted: false, reason: 'duplicate' };
    throw new Error(error.message);
  }
  return { inserted: true, id: data.id };
}

async function logCollection(entry) {
  const supabase = getSupabaseAdmin();
  await supabase.from('pagasa_collection_logs').insert(entry);
}

async function listUpdates({ status, limit = 50, offset = 0 } = {}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('pagasa_updates')
    .select('*')
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

async function getUpdateById(id) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('pagasa_updates').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
}

async function updateById(id, patch) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('pagasa_updates')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function deleteById(id) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('pagasa_updates').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

module.exports = {
  findByHash,
  findByUrl,
  insertUpdate,
  logCollection,
  listUpdates,
  getUpdateById,
  updateById,
  deleteById,
};
