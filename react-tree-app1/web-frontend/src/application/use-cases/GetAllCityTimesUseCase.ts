import { TimeRepository } from '../../infrastructure/repositories/TimeRepository';
import type { TimeResponse } from '../../infrastructure/repositories/TimeRepository';
import type { RootEntity } from '../../domain/entities/RootEntity';

/**
 * 全都市の時刻一括取得ユースケース
 * 世界時計データからすべての都市のタイムゾーンを抽出し、
 * 一括で時刻を取得する
 */
export class GetAllCityTimesUseCase {
  private repository: TimeRepository;

  constructor(repository: TimeRepository) {
    this.repository = repository;
  }

  /**
   * 世界時計データからすべてのタイムゾーンを抽出する
   * @param worldClockData - 世界時計の階層構造データ
   * @returns タイムゾーンの配列（重複なし）
   */
  private extractAllTimezones(worldClockData: RootEntity): string[] {
    const timezones = new Set<string>();
    
    // 階層構造を走査してすべてのタイムゾーンを収集
    for (const area of worldClockData.areas) {
      for (const country of area.countries) {
        for (const city of country.cities) {
          timezones.add(city.timezone);
        }
      }
    }
    
    return Array.from(timezones);
  }

  /**
   * すべての都市の時刻を一括取得する
   * @param worldClockData - 世界時計の階層構造データ
   * @returns タイムゾーンをキーとした時刻情報のマップ
   */
  async execute(worldClockData: RootEntity): Promise<{ [timezone: string]: TimeResponse }> {
    const timezones = this.extractAllTimezones(worldClockData);
    
    if (timezones.length === 0) {
      return {};
    }
    
    return await this.repository.getMultipleCityTimes(timezones);
  }
}