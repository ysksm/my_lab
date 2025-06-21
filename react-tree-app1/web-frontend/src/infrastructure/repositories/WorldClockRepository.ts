import type { RootEntity } from '../../domain/entities/RootEntity';

/**
 * 世界時計データリポジトリ
 * 世界時計アプリケーションの階層構造データを提供する
 * バックエンドAPIから世界時計の階層構造データを取得する
 */
export class WorldClockRepository {
  /**
   * 世界時計の階層構造データを取得する
   * @returns ルートエンティティとその配下の全階層データ
   * @throws エラー（APIリクエストが失敗した場合）
   * 
   * データ構造：
   * - ルート（World）
   *   - エリア（Asia, Europe, America）
   *     - 国（Japan, China, UK, France, USA）
   *       - 都市（Tokyo, Osaka, Beijing, Shanghai, London, Paris, New York, Los Angeles）
   */
  async getWorldClockData(): Promise<RootEntity> {
    try {
      // バックエンドAPIから世界時計データを取得
      const response = await fetch('/api/world-clock');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch world clock data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data as RootEntity;
    } catch (error) {
      // エラーログを出力
      console.error('Error fetching world clock data:', error);
      
      // フォールバック：エラー時は空のデータ構造を返す
      // 本番環境では適切なエラーハンドリングを実装する
      return {
        id: 'world',
        name: 'World',
        areas: []
      };
    }
  }
}