import React from 'react';
import type { CountryEntity } from '../../domain/entities/CountryEntity';
import { CityTime } from './CityTime';

interface CountrySectionProps {
  country: CountryEntity;
}

export const CountrySection: React.FC<CountrySectionProps> = ({ country }) => {
  return (
    <div style={{ marginLeft: '40px', marginBottom: '12px' }}>
      <h3 style={{ fontSize: '16px', margin: '8px 0' }}>{country.name}</h3>
      {country.cities.map(city => (
        <CityTime key={city.id} city={city} />
      ))}
    </div>
  );
};