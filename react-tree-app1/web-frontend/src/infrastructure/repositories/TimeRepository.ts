/**
 * 時刻情報のレスポンス型
 */
export interface TimeResponse {
  time: string;
  timezone: string;
  timestamp: string;
}

/**
 * 時刻データリポジトリ
 * バックエンドAPIから時刻情報を取得する
 */
export class TimeRepository {
  /**
   * 単一都市の時刻を取得する
   * @param timezone - タイムゾーン識別子
   * @returns 時刻情報
   */
  async getCityTime(timezone: string): Promise<TimeResponse> {
    const response = await fetch(`/api/time/${encodeURIComponent(timezone)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch time');
    }
    return response.json();
  }

  /**
   * 複数都市の時刻を一括取得する
   * @param timezones - タイムゾーン識別子の配列
   * @returns タイムゾーンをキーとした時刻情報のマップ
   */
  async getMultipleCityTimes(timezones: string[]): Promise<{ [timezone: string]: TimeResponse }> {
    const response = await fetch('/api/times', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ timezones }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch times');
    }
    
    return response.json();
  }
}