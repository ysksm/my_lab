import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { FileHistoryEntry } from '../../models/api.models';

@Component({
  selector: 'app-file-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './file-history.component.html',
  styleUrl: './file-history.component.scss',
})
export class FileHistoryComponent {
  history: FileHistoryEntry[] = [];
  loading = false;
  error: string | null = null;
  filePath = '';
  limit = 50;

  constructor(private apiService: ApiService) {}

  searchHistory(): void {
    if (!this.filePath.trim()) {
      this.error = 'Please enter a file path';
      return;
    }

    this.loading = true;
    this.error = null;
    this.apiService.getFileHistory(this.filePath, this.limit).subscribe({
      next: (data) => {
        this.history = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load file history';
        this.loading = false;
      },
    });
  }
}
