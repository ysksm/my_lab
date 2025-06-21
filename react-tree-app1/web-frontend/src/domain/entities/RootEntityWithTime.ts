import type { RootEntity } from './RootEntity';
import type { AreaEntityWithTime } from './AreaEntityWithTime';

/**
 * 時刻情報を含むルートエンティティ
 * 配下のエリア、国、都市に時刻データが追加されたRootEntity
 */
export interface RootEntityWithTime extends Omit<RootEntity, 'areas'> {
  /** 時刻情報を含むエリアの配列 */
  areas: AreaEntityWithTime[];
}