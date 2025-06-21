/**
 * 都市エンティティ
 * 都市を表すエンティティ（例：東京、ニューヨーク、ロンドン）
 * 世界時計アプリケーションの最小単位で、実際の時刻を表示する
 */
export interface CityEntity {
  /** 一意の識別子 */
  id: string;
  /** 都市名（例：「東京」、「ニューヨーク」） */
  name: string;
  /** タイムゾーン識別子（例：「Asia/Tokyo」、「America/New_York」） */
  timezone: string;
  /** 親となる国エンティティのID */
  countryId: string;
}