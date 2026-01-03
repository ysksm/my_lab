export interface HotspotResult {
  filePath: string;
  changeCount: number;
  totalInsertions: number;
  totalDeletions: number;
  churn: number;
}

export interface BugFixCommit {
  hash: string;
  authorName: string;
  date: string;
  message: string;
  filesChanged: number;
}

export interface FileHistoryEntry {
  hash: string;
  date: string;
  authorName: string;
  message: string;
  insertions: number;
  deletions: number;
  changeType: string;
}

export interface CoupledFiles {
  file1: string;
  file2: string;
  couplingCount: number;
  couplingPercentage: number;
}

export interface AuthorStats {
  authorName: string;
  commitCount: number;
  filesTouched: number;
  totalInsertions: number;
  totalDeletions: number;
}

export interface BugRiskScore {
  filePath: string;
  changeFrequency: number;
  churn: number;
  bugFixCount: number;
  authorCount: number;
  riskScore: number;
}

export interface DatabaseStats {
  totalCommits: number;
  totalFileChanges: number;
  uniqueFilesTracked: number;
  dateRange: {
    minDate: string | null;
    maxDate: string | null;
  };
}

export interface ImportProgress {
  total: number;
  current: number;
  hash: string;
}
