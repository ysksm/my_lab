import type { ICommitRepository } from "../../domain/repositories/ICommitRepository.ts";
import type { IGitRepository } from "../../domain/repositories/IGitRepository.ts";
import type { ImportProgress } from "../../domain/value-objects/AnalysisResult.ts";

export interface ImportResult {
  importedCount: number;
  totalCount: number;
  repoName: string;
}

export class ImportCommitsUseCase {
  private commitRepository: ICommitRepository;
  private gitRepository: IGitRepository;

  constructor(commitRepository: ICommitRepository, gitRepository: IGitRepository) {
    this.commitRepository = commitRepository;
    this.gitRepository = gitRepository;
  }

  async execute(
    onProgress?: (progress: ImportProgress) => void
  ): Promise<ImportResult> {
    const repoName = await this.gitRepository.getRepoName();
    let importedCount = 0;
    let totalCount = 0;

    for await (const { commit, fileChanges, parentHashes } of this.gitRepository.getAllCommits(onProgress)) {
      totalCount++;

      // 既にインポート済みならスキップ
      if (await this.commitRepository.commitExists(commit.hash)) {
        continue;
      }

      // コミットを保存
      await this.commitRepository.saveCommit(commit);

      // ファイル変更を保存
      for (const fileChange of fileChanges) {
        await this.commitRepository.saveFileChange(fileChange);
      }

      // 親コミット関係を保存
      for (let i = 0; i < parentHashes.length; i++) {
        await this.commitRepository.saveCommitParent(commit.hash, parentHashes[i], i);
      }

      importedCount++;
    }

    return {
      importedCount,
      totalCount,
      repoName,
    };
  }
}
