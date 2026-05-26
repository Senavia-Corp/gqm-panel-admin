export interface PodioFailedSync {
  id: number;
  item_id: string | null;
  hook_type: string | null;
  payload: any | null;
  error_message: string | null;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface FailedSyncsCount {
  count: number;
}
