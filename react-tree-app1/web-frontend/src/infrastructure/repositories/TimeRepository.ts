/**
 * 時刻APIのレスポンス型
 */
export interface TimeResponse {
  /** フォーマットされた時刻文字列（HH:MM:SS形式） */
  time: string;
  /** タイムゾーン識別子 */
  timezone: string;
  /** ISO形式のタイムスタンプ */
  timestamp: string;
}

/**
 * 時刻データリポジトリ
 * バックエンドAPIと通信して都市の現在時刻を取得する
 */
export class TimeRepository {
  /**
   * 指定されたタイムゾーンの現在時刻を取得する
   * @param timezone - タイムゾーン識別子（例：「Asia/Tokyo」）
   * @returns 時刻情報のレスポンス
   * @throws {Error} APIリクエストが失敗した場合
   */
  async getCityTime(timezone: string): Promise<TimeResponse> {
    // タイムゾーンをURLエンコードしてAPIエンドポイントを構築
    const response = await fetch(`/api/time/${encodeURIComponent(timezone)}`);
    
    // レスポンスのステータスをチェック
    if (!response.ok) {
      throw new Error('Failed to fetch time');
    }
    
    // JSONレスポンスをパースして返す
    return response.json();
  }
}