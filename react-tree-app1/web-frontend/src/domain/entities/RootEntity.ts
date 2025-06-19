import type { AreaEntity } from './AreaEntity';

export interface RootEntity {
  id: string;
  name: string;
  areas: AreaEntity[];
}