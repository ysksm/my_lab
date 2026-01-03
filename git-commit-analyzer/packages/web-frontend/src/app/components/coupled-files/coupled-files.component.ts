import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CoupledFiles } from '../../models/api.models';

@Component({
  selector: 'app-coupled-files',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coupled-files.component.html',
  styleUrl: './coupled-files.component.scss',
})
export class CoupledFilesComponent implements OnInit {
  coupledFiles: CoupledFiles[] = [];
  loading = true;
  error: string | null = null;
  minCoupling = 3;
  limit = 30;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadCoupledFiles();
  }

  loadCoupledFiles(): void {
    this.loading = true;
    this.apiService.getCoupledFiles(this.minCoupling, this.limit).subscribe({
      next: (data) => {
        this.coupledFiles = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load coupled files';
        this.loading = false;
      },
    });
  }
}
