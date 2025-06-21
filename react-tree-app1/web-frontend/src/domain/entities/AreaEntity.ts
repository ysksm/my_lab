import type { CountryEntity } from './CountryEntity';

/**
 * エリアエンティティ
 * 地理的な地域を表すエンティティ（例：アジア、ヨーロッパ、アメリカ）
 * ルートエンティティの配下で、複数の国を管理する
 */
export interface AreaEntity {
  /** 一意の識別子 */
  id: string;
  /** エリア名（例：「アジア」、「ヨーロッパ」） */
  name: string;
  /** 親となるルートエンティティのID */
  rootId: string;
  /** エリア内の国の配列 */
  countries: CountryEntity[];
}