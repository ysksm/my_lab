import React from 'react';
import type { RootEntityWithTime } from '../../domain/entities/RootEntityWithTime';
import { AreaSection } from './AreaSection';

/**
 * ルートセクションコンポーネントのプロパティ
 */
interface RootSectionProps {
  /** 時刻情報を含むルートエンティティデータ */
  root: RootEntityWithTime;
}

/**
 * ルートセクションコンポーネント
 * 世界時計アプリケーションの最上位コンポーネント
 * 時刻情報が統合されたデータを下位コンポーネントに渡す
 */
export const RootSection: React.FC<RootSectionProps> = ({ root }) => {
  return (
    <div style={{ padding: '20px' }}>
      {/* アプリケーションのタイトル */}
      <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>{root.name} Clock</h1>
      
      {/* 各エリアセクションを描画 */}
      {root.areas.map(area => (
        <AreaSection key={area.id} area={area} />
      ))}
    </div>
  );
};