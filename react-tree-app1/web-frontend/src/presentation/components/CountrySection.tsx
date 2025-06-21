import React from 'react';
import type { CountryEntity } from '../../domain/entities/CountryEntity';
import { CityTime } from './CityTime';

/**
 * 国セクションコンポーネントのプロパティ
 */
interface CountrySectionProps {
  /** 国エンティティデータ */
  country: CountryEntity;
}

/**
 * 国セクションコンポーネント
 * 国（日本、アメリカなど）を表示するコンポーネント
 * 配下の都市時刻コンポーネントを階層的に描画する
 */
export const CountrySection: React.FC<CountrySectionProps> = ({ country }) => {
  return (
    <div style={{ marginLeft: '40px', marginBottom: '12px' }}>
      {/* 国名のヘッダー */}
      <h3 style={{ fontSize: '16px', margin: '8px 0' }}>{country.name}</h3>
      
      {/* 各都市の時刻を描画 */}
      {country.cities.map(city => (
        <CityTime key={city.id} city={city} />
      ))}
    </div>
  );
};