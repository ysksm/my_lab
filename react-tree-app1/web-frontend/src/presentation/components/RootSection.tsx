import React from 'react';
import type { RootEntity } from '../../domain/entities/RootEntity';
import { AreaSection } from './AreaSection';

interface RootSectionProps {
  root: RootEntity;
}

export const RootSection: React.FC<RootSectionProps> = ({ root }) => {
  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>{root.name} Clock</h1>
      {root.areas.map(area => (
        <AreaSection key={area.id} area={area} />
      ))}
    </div>
  );
};