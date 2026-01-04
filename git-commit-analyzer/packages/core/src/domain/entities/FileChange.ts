export type ChangeType = "A" | "M" | "D" | "R";

export interface FileChangeProps {
  id?: number;
  commitHash: string;
  filePath: string;
  changeType: ChangeType;
  insertions: number;
  deletions: number;
}

export class FileChange {
  readonly id?: number;
  readonly commitHash: string;
  readonly filePath: string;
  readonly changeType: ChangeType;
  readonly insertions: number;
  readonly deletions: number;

  constructor(props: FileChangeProps) {
    this.id = props.id;
    this.commitHash = props.commitHash;
    this.filePath = props.filePath;
    this.changeType = props.changeType;
    this.insertions = props.insertions;
    this.deletions = props.deletions;
  }

  get churn(): number {
    return this.insertions + this.deletions;
  }

  get fileName(): string {
    return this.filePath.split("/").pop() || this.filePath;
  }

  get directory(): string {
    const parts = this.filePath.split("/");
    parts.pop();
    return parts.join("/") || ".";
  }
}
