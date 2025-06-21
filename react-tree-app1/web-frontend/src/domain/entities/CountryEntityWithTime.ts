import type { CountryEntity } from './CountryEntity';
import type { CityEntityWithTime } from './CityEntityWithTime';

/**
 * 時刻情報を含む国エンティティ
 * 配下の都市に時刻データが追加されたCountryEntity
 */
export interface CountryEntityWithTime extends Omit<CountryEntity, 'cities'> {
  /** 時刻情報を含む都市の配列 */
  cities: CityEntityWithTime[];
}