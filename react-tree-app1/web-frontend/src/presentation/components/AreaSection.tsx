import React from 'react';
import type { AreaEntity } from '../../domain/entities/AreaEntity';
import { CountrySection } from './CountrySection';

interface AreaSectionProps {
  area: AreaEntity;
}

export const AreaSection: React.FC<AreaSectionProps> = ({ area }) => {
  return (
    <div style={{ marginLeft: '20px', marginBottom: '16px' }}>
      <h2 style={{ fontSize: '20px', margin: '12px 0' }}>{area.name}</h2>
      {area.countries.map(country => (
        <CountrySection key={country.id} country={country} />
      ))}
    </div>
  );
};