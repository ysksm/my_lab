import React from 'react';
import type { RootEntity } from '../../domain/entities/RootEntity';
import type { TimeResponse } from '../../infrastructure/repositories/TimeRepository';
import { AreaSection } from './AreaSection';

/**
 * ルートセクションコンポーネントのプロパティ
 */
interface RootSectionProps {
  /** ルートエンティティデータ */
  root: RootEntity;
  /** 全都市の時刻データ（タイムゾーンをキーとしたマップ） */
  cityTimes: { [timezone: string]: TimeResponse };
}

/**
 * ルートセクションコンポーネント
 * 世界時計アプリケーションの最上位コンポーネント
 * 時刻データを下位コンポーネントに配布する
 */
export const RootSection: React.FC<RootSectionProps> = ({ root, cityTimes }) => {
  return (
    <div style={{ padding: '20px' }}>
      {/* アプリケーションのタイトル */}
      <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>{root.name} Clock</h1>
      
      {/* 各エリアセクションを描画 */}
      {root.areas.map(area => (
        <AreaSection key={area.id} area={area} cityTimes={cityTimes} />
      ))}
    </div>
  );
};