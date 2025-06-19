import type { CountryEntity } from './CountryEntity';

export interface AreaEntity {
  id: string;
  name: string;
  rootId: string;
  countries: CountryEntity[];
}