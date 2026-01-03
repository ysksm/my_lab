import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { HotspotResult } from '../../models/api.models';

@Component({
  selector: 'app-hotspots',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hotspots.component.html',
  styleUrl: './hotspots.component.scss',
})
export class HotspotsComponent implements OnInit {
  hotspots: HotspotResult[] = [];
  loading = true;
  error: string | null = null;
  limit = 20;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadHotspots();
  }

  loadHotspots(): void {
    this.loading = true;
    this.apiService.getHotspots(this.limit).subscribe({
      next: (data) => {
        this.hotspots = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load hotspots';
        this.loading = false;
      },
    });
  }
}
