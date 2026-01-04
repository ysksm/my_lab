export interface CommitProps {
  hash: string;
  authorName: string;
  authorEmail: string;
  date: Date;
  message: string;
  isMerge: boolean;
}

export class Commit {
  readonly hash: string;
  readonly authorName: string;
  readonly authorEmail: string;
  readonly date: Date;
  readonly message: string;
  readonly isMerge: boolean;

  constructor(props: CommitProps) {
    this.hash = props.hash;
    this.authorName = props.authorName;
    this.authorEmail = props.authorEmail;
    this.date = props.date;
    this.message = props.message;
    this.isMerge = props.isMerge;
  }

  get shortHash(): string {
    return this.hash.substring(0, 7);
  }

  isBugFix(): boolean {
    const message = this.message.toLowerCase();
    return (
      message.includes("fix") ||
      message.includes("bug") ||
      message.includes("issue") ||
      message.includes("error") ||
      message.includes("defect") ||
      message.includes("修正") ||
      message.includes("バグ") ||
      message.includes("不具合")
    );
  }
}
