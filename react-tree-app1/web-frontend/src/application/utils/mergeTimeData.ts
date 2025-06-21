import type { RootEntity } from '../../domain/entities/RootEntity';
import type { RootEntityWithTime } from '../../domain/entities/RootEntityWithTime';
import type { TimeResponse } from '../../infrastructure/repositories/TimeRepository';

/**
 * 世界時計データに時刻情報をマージする
 * @param worldClockData - 世界時計の階層構造データ
 * @param cityTimes - タイムゾーンをキーとした時刻情報のマップ
 * @returns 時刻情報が統合された世界時計データ
 */
export function mergeTimeData(
  worldClockData: RootEntity,
  cityTimes: { [timezone: string]: TimeResponse }
): RootEntityWithTime {
  return {
    ...worldClockData,
    areas: worldClockData.areas.map(area => ({
      ...area,
      countries: area.countries.map(country => ({
        ...country,
        cities: country.cities.map(city => ({
          ...city,
          currentTime: cityTimes[city.timezone]?.time || 'Loading...'
        }))
      }))
    }))
  };
}