import React from 'react';
import type { AreaEntity } from '../../domain/entities/AreaEntity';
import { CountrySection } from './CountrySection';
import styles from './AreaSection.module.css';

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
    <div className={styles.areaContainer}>
      {/* エリア名のヘッダー */}
      <h2 className={styles.areaHeader}>{area.name}</h2>
      
      {/* 各国セクションを描画 */}
      {area.countries.map(country => (
        <CountrySection key={country.id} country={country} />
      ))}
    </div>
  );
};
