import { ApiProvider } from '@/app/providers/api-provider';
import { PodioFailedSync, FailedSyncsCount } from './sync-podio.types';

export class SyncPodioService {
  private api: ApiProvider;

  constructor() {
    this.api = ApiProvider.getInstance();
  }

  async getFailedSyncsCount(): Promise<number> {
    const { data } = await this.api.get<FailedSyncsCount>("/webhook/podio/failed_syncs/count");
    return data.count;
  }

  async getFailedSyncs(): Promise<PodioFailedSync[]> {
    const { data } = await this.api.get<PodioFailedSync[]>("/webhook/podio/failed_syncs");
    return data;
  }

  async resyncFailedSync(id: number): Promise<any> {
    const { data } = await this.api.post<any>(`/webhook/podio/failed_syncs/${id}/resync`, {});
    return data;
  }

  async deleteFailedSync(id: number): Promise<any> {
    const { data } = await this.api.delete<any>(`/webhook/podio/failed_syncs/${id}`);
    return data;
  }
}