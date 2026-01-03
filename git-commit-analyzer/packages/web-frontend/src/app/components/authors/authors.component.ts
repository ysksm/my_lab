import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { AuthorStats } from '../../models/api.models';

@Component({
  selector: 'app-authors',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './authors.component.html',
  styleUrl: './authors.component.scss',
})
export class AuthorsComponent implements OnInit {
  authors: AuthorStats[] = [];
  loading = true;
  error: string | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadAuthors();
  }

  loadAuthors(): void {
    this.loading = true;
    this.apiService.getAuthorStats().subscribe({
      next: (data) => {
        this.authors = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load author stats';
        this.loading = false;
      },
    });
  }
}
