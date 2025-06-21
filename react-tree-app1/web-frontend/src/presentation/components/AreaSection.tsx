import React from 'react';
import type { AreaEntity } from '../../domain/entities/AreaEntity';
import { CountrySection } from './CountrySection';

/**
 * エリアセクションコンポーネントのプロパティ
 */
interface AreaSectionProps {
  /** エリアエンティティデータ */
  area: AreaEntity;
}

/**
 * エリアセクションコンポーネント
 * 地理的な地域（アジア、ヨーロッパなど）を表示するコンポーネント
 * 配下の国セクションを階層的に描画する
 */
export const AreaSection: React.FC<AreaSectionProps> = ({ area }) => {
  return (
    <div style={{ marginLeft: '20px', marginBottom: '16px' }}>
      {/* エリア名のヘッダー */}
      <h2 style={{ fontSize: '20px', margin: '12px 0' }}>{area.name}</h2>
      
      {/* 各国セクションを描画 */}
      {area.countries.map(country => (
        <CountrySection key={country.id} country={country} />
      ))}
    </div>
  );
};