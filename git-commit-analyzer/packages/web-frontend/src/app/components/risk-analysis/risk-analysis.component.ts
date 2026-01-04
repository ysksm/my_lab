import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { BugRiskScore } from '../../models/api.models';

@Component({
  selector: 'app-risk-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './risk-analysis.component.html',
  styleUrl: './risk-analysis.component.scss',
})
export class RiskAnalysisComponent implements OnInit {
  risks: BugRiskScore[] = [];
  loading = true;
  error: string | null = null;
  limit = 20;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadRisks();
  }

  loadRisks(): void {
    this.loading = true;
    this.apiService.getBugRiskScores(this.limit).subscribe({
      next: (data) => {
        this.risks = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load risk scores';
        this.loading = false;
      },
    });
  }

  getRiskLevel(score: number): string {
    if (score >= 100) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }
}
