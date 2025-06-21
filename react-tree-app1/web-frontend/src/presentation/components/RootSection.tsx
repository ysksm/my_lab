import React from 'react';
import type { RootEntity } from '../../domain/entities/RootEntity';
import { AreaSection } from './AreaSection';

/**
 * ルートセクションコンポーネントのプロパティ
 */
interface RootSectionProps {
  /** ルートエンティティデータ */
  root: RootEntity;
}

/**
 * ルートセクションコンポーネント
 * 世界時計アプリケーションの最上位コンポーネント
 * ルートエンティティの情報を表示し、配下のエリアセクションを描画する
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