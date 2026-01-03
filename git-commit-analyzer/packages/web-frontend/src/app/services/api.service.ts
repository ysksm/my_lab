import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  DatabaseStats,
  HotspotResult,
  BugFixCommit,
  FileHistoryEntry,
  CoupledFiles,
  AuthorStats,
  BugRiskScore,
  CommitDetails,
  ImportResult,
} from '../models/api.models';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getStats(): Observable<DatabaseStats> {
    return this.http.get<DatabaseStats>(`${this.baseUrl}/stats`);
  }

  getHotspots(limit = 20): Observable<HotspotResult[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<HotspotResult[]>(`${this.baseUrl}/hotspots`, { params });
  }

  getBugFixes(limit = 30): Observable<BugFixCommit[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<BugFixCommit[]>(`${this.baseUrl}/bugfixes`, { params });
  }

  getFileHistory(filePath: string, limit = 50): Observable<FileHistoryEntry[]> {
    const params = new HttpParams().set('file', filePath).set('limit', limit.toString());
    return this.http.get<FileHistoryEntry[]>(`${this.baseUrl}/history`, { params });
  }

  getCoupledFiles(minCoupling = 3, limit = 30): Observable<CoupledFiles[]> {
    const params = new HttpParams()
      .set('min', minCoupling.toString())
      .set('limit', limit.toString());
    return this.http.get<CoupledFiles[]>(`${this.baseUrl}/coupled`, { params });
  }

  getAuthorStats(): Observable<AuthorStats[]> {
    return this.http.get<AuthorStats[]>(`${this.baseUrl}/authors`);
  }

  getHighChurnFiles(minChurn = 100, limit = 20): Observable<HotspotResult[]> {
    const params = new HttpParams()
      .set('min', minChurn.toString())
      .set('limit', limit.toString());
    return this.http.get<HotspotResult[]>(`${this.baseUrl}/churn`, { params });
  }

  getBugRiskScores(limit = 20): Observable<BugRiskScore[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<BugRiskScore[]>(`${this.baseUrl}/risk`, { params });
  }

  getCommitDetails(hash: string): Observable<CommitDetails> {
    const params = new HttpParams().set('hash', hash);
    return this.http.get<CommitDetails>(`${this.baseUrl}/commit`, { params });
  }

  importRepository(path: string): Observable<ImportResult> {
    return this.http.post<ImportResult>(`${this.baseUrl}/import`, { path });
  }

  executeQuery<T>(sql: string): Observable<T[]> {
    return this.http.post<T[]>(`${this.baseUrl}/query`, { sql });
  }
}
