import { useEffect, useState } from 'react';
import { RootSection } from './presentation/components/RootSection';
import { GetWorldClockUseCase } from './application/use-cases/GetWorldClockUseCase';
import { WorldClockRepository } from './infrastructure/repositories/WorldClockRepository';
import type { RootEntity } from './domain/entities/RootEntity';
import './App.css';

/**
 * アプリケーションのメインコンポーネント
 * 世界時計アプリケーションのエントリーポイント
 * 階層構造データを取得し、ルートセクションコンポーネントに渡して描画する
 */
function App() {
  /** 世界時計データの状態 */
  const [worldClockData, setWorldClockData] = useState<RootEntity | null>(null);

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

  // データがまだ取得されていない場合はローディング表示
  if (!worldClockData) {
    return <div>Loading...</div>;
  }
  
  console.log('Rendering World Clock Data:', worldClockData);
  
  // 取得したデータをルートセクションコンポーネントに渡して描画
  return <RootSection root={worldClockData} />;
}

export default App;