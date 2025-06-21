import React, { useState, useEffect } from 'react';
import type { CityEntity } from '../../domain/entities/CityEntity';
import { GetCityTimeUseCase } from '../../application/use-cases/GetCityTimeUseCase';
import { TimeRepository } from '../../infrastructure/repositories/TimeRepository';

/**
 * 都市時刻コンポーネントのプロパティ
 */
interface CityTimeProps {
  /** 都市エンティティデータ */
  city: CityEntity;
}

/**
 * 都市時刻コンポーネント
 * 特定の都市の現在時刻をリアルタイムで表示するコンポーネント
 * 1秒ごとに時刻を更新し、常に最新の時刻を表示する
 */
export const CityTime: React.FC<CityTimeProps> = ({ city }) => {
  /** 現在時刻の状態 */
  const [time, setTime] = useState<string>('');
  /** ローディング状態 */
  const [loading, setLoading] = useState<boolean>(true);
  /** エラー状態 */
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // リポジトリとユースケースのインスタンスを作成
    const repository = new TimeRepository();
    const useCase = new GetCityTimeUseCase(repository);

    /**
     * 時刻を更新する非同期関数
     * APIから最新の時刻を取得して状態を更新する
     */
    const updateTime = async () => {
      try {
        // 都市のタイムゾーンを使用して時刻を取得
        const response = await useCase.execute(city.timezone);
        setTime(response.time);
        setError(null);
      } catch (err) {
        // エラーが発生した場合はエラーメッセージを設定
        setError('Failed to fetch time');
        console.error('Error fetching time:', err);
      } finally {
        // ローディング状態を解除
        setLoading(false);
      }
    };

    // 初回の時刻取得
    updateTime();
    
    // 1秒ごとに時刻を更新するインターバルを設定
    const interval = setInterval(updateTime, 1000);

    // クリーンアップ関数：コンポーネントのアンマウント時にインターバルをクリア
    return () => clearInterval(interval);
  }, [city.timezone]);

  return (
    <div style={{ marginLeft: '60px', padding: '8px', border: '1px solid #ddd', marginBottom: '4px' }}>
      {/* 都市名 */}
      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>{city.name}</h4>
      
      {/* 時刻表示：ローディング中、エラー、または実際の時刻を表示 */}
      <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold' }}>
        {loading ? 'Loading...' : error ? error : time}
      </p>
    </div>
  );
};