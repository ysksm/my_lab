import type { AreaEntity } from './AreaEntity';

/**
 * ルートエンティティ
 * 世界時計アプリケーションの最上位のエンティティ
 * 複数のエリア（地域）を管理する
 */
export interface RootEntity {
  /** 一意の識別子 */
  id: string;
  /** ルートエンティティの名前（例：「世界時計」） */
  name: string;
  /** 管理するエリアの配列 */
  areas: AreaEntity[];
}