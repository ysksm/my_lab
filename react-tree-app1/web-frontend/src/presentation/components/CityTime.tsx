import React from 'react';
import type { CityEntity } from '../../domain/entities/CityEntity';
import type { TimeResponse } from '../../infrastructure/repositories/TimeRepository';

/**
 * 都市時刻コンポーネントのプロパティ
 */
interface CityTimeProps {
  /** 都市エンティティデータ */
  city: CityEntity;
  /** 時刻データ（上位コンポーネントから渡される） */
  timeData?: TimeResponse;
}

/**
 * 都市時刻コンポーネント
 * 都市名と現在時刻を表示する最下位のコンポーネント
 * 時刻データは上位コンポーネントから受け取る（自身では取得しない）
 */
export const CityTime: React.FC<CityTimeProps> = ({ city, timeData }) => {
  return (
    <div style={{ marginLeft: '60px', padding: '8px', border: '1px solid #ddd', marginBottom: '4px' }}>
      {/* 都市名 */}
      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>{city.name}</h4>
      
      {/* 時刻表示 */}
      <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold' }}>
        {timeData ? timeData.time : 'Loading...'}
      </p>
    </div>
  );
};