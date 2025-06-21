import type { RootEntity } from '../../domain/entities/RootEntity';
import { WorldClockRepository } from '../../infrastructure/repositories/WorldClockRepository';

/**
 * 世界時計データ取得ユースケース
 * アプリケーション全体の階層構造データを取得するビジネスロジックを実装
 * ドメイン層とインフラストラクチャ層の橋渡しを行う
 */
export class GetWorldClockUseCase {
  /** 世界時計データを提供するリポジトリ */
  private repository: WorldClockRepository;

  /**
   * コンストラクタ
   * @param repository - 世界時計データリポジトリのインスタンス
   */
  constructor(repository: WorldClockRepository) {
    this.repository = repository;
  }

  /**
   * 世界時計データを取得する
   * @returns ルートエンティティとその配下の全階層データ
   */
  async execute(): Promise<RootEntity> {
    return await this.repository.getWorldClockData();
  }
}