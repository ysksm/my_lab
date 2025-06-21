import type { AreaEntity } from './AreaEntity';
import type { CountryEntityWithTime } from './CountryEntityWithTime';

/**
 * 時刻情報を含むエリアエンティティ
 * 配下の国と都市に時刻データが追加されたAreaEntity
 */
export interface AreaEntityWithTime extends Omit<AreaEntity, 'countries'> {
  /** 時刻情報を含む国の配列 */
  countries: CountryEntityWithTime[];
}