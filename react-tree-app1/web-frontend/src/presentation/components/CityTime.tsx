import React, { useState, useEffect } from 'react';
import type { CityEntity } from '../../domain/entities/CityEntity';

interface CityTimeProps {
  city: CityEntity;
}

export const CityTime: React.FC<CityTimeProps> = ({ city }) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const cityTime = new Date(now.toLocaleString('en-US', { timeZone: city.timezone }));
      setTime(cityTime.toLocaleTimeString());
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [city.timezone]);

  return (
    <div style={{ marginLeft: '60px', padding: '8px', border: '1px solid #ddd', marginBottom: '4px' }}>
      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>{city.name}</h4>
      <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold' }}>{time}</p>
    </div>
  );
};