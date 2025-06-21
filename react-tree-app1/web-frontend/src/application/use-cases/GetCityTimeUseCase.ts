import { TimeRepository } from '../../infrastructure/repositories/TimeRepository';
import type { TimeResponse } from '../../infrastructure/repositories/TimeRepository';

/**
 * 都市の時刻取得ユースケース
 * 特定の都市（タイムゾーン）の現在時刻を取得するビジネスロジックを実装
 */
export class GetCityTimeUseCase {
  /** 時刻データを提供するリポジトリ */
  private repository: TimeRepository;

  /**
   * コンストラクタ
   * @param repository - 時刻データリポジトリのインスタンス
   */
  constructor(repository: TimeRepository) {
    this.repository = repository;
  }

  /**
   * 指定されたタイムゾーンの現在時刻を取得する
   * @param timezone - タイムゾーン識別子（例：「Asia/Tokyo」）
   * @returns 時刻情報のレスポンス
   */
  async execute(timezone: string): Promise<TimeResponse> {
    return await this.repository.getCityTime(timezone);
  }
}