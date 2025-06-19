import type { CityEntity } from './CityEntity';

export interface CountryEntity {
  id: string;
  name: string;
  areaId: string;
  cities: CityEntity[];
}