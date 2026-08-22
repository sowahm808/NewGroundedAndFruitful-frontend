import { HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core/http/api-client.service';

export type ReportJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'expired' | 'cancelled';

/** GET /admin/reports currently publishes no list query parameters. */
export type ReportJobQuery = Record<string, never>;

export interface ReportJob {
  readonly id: string;
  readonly reportType: string;
  readonly reportName?: string;
  readonly quarterName?: string;
  readonly periodStart?: string;
  readonly periodEnd?: string;
  readonly scopeLabel: string;
  readonly status: ReportJobStatus;
  readonly requestedBy: string;
  readonly createdAt: string;
  readonly completedAt?: string;
  readonly expiresAt?: string;
  readonly allowedActions?: readonly ('view' | 'download' | 'retry' | 'cancel')[];
}

export interface ReportJobsPayload {
  readonly items: readonly ReportJob[];
}

export interface CreateReportRequest {
  readonly reportType: string;
  readonly quarterId?: string;
  readonly teamId?: string;
  readonly periodStart?: string;
  readonly periodEnd?: string;
}

export interface ReportDownload {
  readonly url: string;
  readonly expiresAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminReportsApiService {
  private readonly api = inject(ApiClient);

  list(): Observable<ReportJobsPayload> {
    // Deliberately omit params: this operation is not a page/sort based resource endpoint.
    return this.api.getData<ReportJobsPayload>('/admin/reports');
  }

  create(request: CreateReportRequest, idempotencyKey: string): Observable<ReportJob> {
    return this.api.postData<ReportJob>('/admin/reports', request, {
      headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }),
    });
  }

  job(jobId: string): Observable<ReportJob> {
    return this.api.getData<ReportJob>(`/admin/reports/${encodeURIComponent(jobId)}`);
  }

  command(jobId: string, command: 'retry' | 'cancel'): Observable<ReportJob> {
    return this.api.postData<ReportJob>(`/admin/reports/${encodeURIComponent(jobId)}/${command}`, {});
  }

  download(jobId: string): Observable<ReportDownload> {
    return this.api.postData<ReportDownload>(`/admin/reports/${encodeURIComponent(jobId)}/download`, {});
  }
}
