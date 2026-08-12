/** DOST-PAGASA update categories */
export type PagasaUpdateCategory =
  | 'Weather Advisory'
  | 'Tropical Cyclone'
  | 'Rainfall Warning'
  | 'Thunderstorm Advisory'
  | 'Flood Advisory'
  | 'Severe Weather'
  | 'Earthquake'
  | 'Climate'
  | 'Public Advisory'
  | 'General News'
  | 'Other';

export type PagasaUpdateStatus = 'pending' | 'approved' | 'rejected' | 'failed';

export type PagasaUpdateSeverity =
  | 'info'
  | 'low'
  | 'moderate'
  | 'high'
  | 'critical'
  | 'unknown';

export interface PagasaUpdate {
  id: number;
  title: string;
  original_content: string;
  ai_summary: string | null;
  category: PagasaUpdateCategory;
  source_name: string;
  source_url: string;
  published_at: string | null;
  collected_at: string;
  affected_locations: string[];
  severity: PagasaUpdateSeverity;
  status: PagasaUpdateStatus;
  content_hash: string;
  is_important: boolean;
  ai_processing_status: string;
  created_at: string;
  updated_at: string;
}

export interface PagasaUpdatesFeed {
  todayKey: string;
  todayLabel: string;
  timezone: string;
  today: PagasaUpdate[];
  previous: PagasaUpdate[];
  archive: PagasaUpdate[];
  hasTodayUpdates: boolean;
  /** Most recent official item not published today (for empty-today state) */
  latestOlder: PagasaUpdate | null;
}
