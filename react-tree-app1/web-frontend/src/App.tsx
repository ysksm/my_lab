import { useEffect, useState } from 'react';
import { RootSection } from './presentation/components/RootSection';
import { GetWorldClockUseCase } from './application/use-cases/GetWorldClockUseCase';
import { WorldClockRepository } from './infrastructure/repositories/WorldClockRepository';
import type { RootEntity } from './domain/entities/RootEntity';
import './App.css';

function App() {
  const [worldClockData, setWorldClockData] = useState<RootEntity | null>(null);

  useEffect(() => {
    const fetchWorldClockData = async () => {
      const repository = new WorldClockRepository();
      const useCase = new GetWorldClockUseCase(repository);
      const data = await useCase.execute();
      setWorldClockData(data);
    };

    fetchWorldClockData();
  }, []);

  if (!worldClockData) {
    return <div>Loading...</div>;
  }

  return <RootSection root={worldClockData} />;
}

export default App;