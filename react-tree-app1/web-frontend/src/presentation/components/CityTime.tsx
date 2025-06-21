import React from 'react';
import type { CityEntityWithTime } from '../../domain/entities/CityEntityWithTime';

/**
 * 都市時刻コンポーネントのプロパティ
 */
interface CityTimeProps {
  /** 時刻情報を含む都市エンティティデータ */
  city: CityEntityWithTime;
}

/**
 * 都市時刻コンポーネント
 * 都市名と現在時刻を表示する最下位のコンポーネント
 * 時刻データはエンティティ内に統合されている
 */
export const CityTime: React.FC<CityTimeProps> = ({ city }) => {
  return (
    <div style={{ marginLeft: '60px', padding: '8px', border: '1px solid #ddd', marginBottom: '4px' }}>
      {/* 都市名 */}
      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>{city.name}</h4>
      
      {/* 時刻表示 */}
      <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold' }}>
        {city.currentTime || 'Loading...'}
      </p>
    </div>
  );
};