import type { CityEntity } from './CityEntity';

/**
 * 時刻情報を含む都市エンティティ
 * 表示用に時刻データが追加されたCityEntity
 */
export interface CityEntityWithTime extends CityEntity {
  /** 現在時刻（HH:MM:SS形式） */
  currentTime?: string;
}