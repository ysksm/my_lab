import type { CityEntity } from './CityEntity';

/**
 * 国エンティティ
 * 国を表すエンティティ（例：日本、アメリカ、イギリス）
 * エリアエンティティの配下で、複数の都市を管理する
 */
export interface CountryEntity {
  /** 一意の識別子 */
  id: string;
  /** 国名（例：「日本」、「アメリカ」） */
  name: string;
  /** 親となるエリアエンティティのID */
  areaId: string;
  /** 国内の都市の配列 */
  cities: CityEntity[];
}