import { useEffect, useState } from 'react';
import { RootSection } from './presentation/components/RootSection';
import { GetWorldClockUseCase } from './application/use-cases/GetWorldClockUseCase';
import { GetAllCityTimesUseCase } from './application/use-cases/GetAllCityTimesUseCase';
import { WorldClockRepository } from './infrastructure/repositories/WorldClockRepository';
import { TimeRepository } from './infrastructure/repositories/TimeRepository';
import type { RootEntity } from './domain/entities/RootEntity';
import type { TimeResponse } from './infrastructure/repositories/TimeRepository';
import './App.css';

/**
 * アプリケーションのメインコンポーネント
 * 世界時計アプリケーションのエントリーポイント
 * 階層構造データと全都市の時刻を取得し、下位コンポーネントに渡す
 */
function App() {
  /** 世界時計データの状態 */
  const [worldClockData, setWorldClockData] = useState<RootEntity | null>(null);
  /** 全都市の時刻データの状態（タイムゾーンをキーとしたマップ） */
  const [cityTimes, setCityTimes] = useState<{ [timezone: string]: TimeResponse }>({});

  useEffect(() => {
    /**
     * 世界時計データを非同期で取得する関数
     * アプリケーション起動時に一度だけ実行される
     */
    const fetchWorldClockData = async () => {
      // リポジトリとユースケースのインスタンスを作成
      const repository = new WorldClockRepository();
      const useCase = new GetWorldClockUseCase(repository);
      
      // 世界時計データを取得
      const data = await useCase.execute();
      console.log('Fetched World Clock Data:', data);
      
      // 取得したデータを状態に設定
      setWorldClockData(data);
    };

    // データ取得を実行
    fetchWorldClockData();
  }, []); // 空の依存配列により、マウント時に一度だけ実行

  useEffect(() => {
    if (!worldClockData) return;

    /**
     * 全都市の時刻を一括取得する関数
     * 1秒ごとに実行される
     */
    const fetchAllCityTimes = async () => {
      const timeRepository = new TimeRepository();
      const timeUseCase = new GetAllCityTimesUseCase(timeRepository);
      
      try {
        // 全都市の時刻を一括取得
        const times = await timeUseCase.execute(worldClockData);
        setCityTimes(times);
      } catch (error) {
        console.error('Error fetching city times:', error);
      }
    };

    // 初回実行
    fetchAllCityTimes();

    // 1秒ごとに時刻を更新
    const interval = setInterval(fetchAllCityTimes, 1000);

    // クリーンアップ関数
    return () => clearInterval(interval);
  }, [worldClockData]);

  // データがまだ取得されていない場合はローディング表示
  if (!worldClockData) {
    return <div>Loading...</div>;
  }
  
  console.log('Rendering World Clock Data:', worldClockData);
  console.log('City Times:', cityTimes);
  
  // 取得したデータをルートセクションコンポーネントに渡して描画
  return <RootSection root={worldClockData} cityTimes={cityTimes} />;
}

export default App;