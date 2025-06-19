import type { RootEntity } from '../../domain/entities/RootEntity';

export class WorldClockRepository {
  async getWorldClockData(): Promise<RootEntity> {
    return {
      id: 'world',
      name: 'World',
      areas: [
        {
          id: 'asia',
          name: 'Asia',
          rootId: 'world',
          countries: [
            {
              id: 'japan',
              name: 'Japan',
              areaId: 'asia',
              cities: [
                { id: 'tokyo', name: 'Tokyo', timezone: 'Asia/Tokyo', countryId: 'japan' },
                { id: 'osaka', name: 'Osaka', timezone: 'Asia/Tokyo', countryId: 'japan' }
              ]
            },
            {
              id: 'china',
              name: 'China',
              areaId: 'asia',
              cities: [
                { id: 'beijing', name: 'Beijing', timezone: 'Asia/Shanghai', countryId: 'china' },
                { id: 'shanghai', name: 'Shanghai', timezone: 'Asia/Shanghai', countryId: 'china' }
              ]
            }
          ]
        },
        {
          id: 'europe',
          name: 'Europe',
          rootId: 'world',
          countries: [
            {
              id: 'uk',
              name: 'United Kingdom',
              areaId: 'europe',
              cities: [
                { id: 'london', name: 'London', timezone: 'Europe/London', countryId: 'uk' }
              ]
            },
            {
              id: 'france',
              name: 'France',
              areaId: 'europe',
              cities: [
                { id: 'paris', name: 'Paris', timezone: 'Europe/Paris', countryId: 'france' }
              ]
            }
          ]
        },
        {
          id: 'america',
          name: 'America',
          rootId: 'world',
          countries: [
            {
              id: 'usa',
              name: 'United States',
              areaId: 'america',
              cities: [
                { id: 'newyork', name: 'New York', timezone: 'America/New_York', countryId: 'usa' },
                { id: 'losangeles', name: 'Los Angeles', timezone: 'America/Los_Angeles', countryId: 'usa' }
              ]
            }
          ]
        }
      ]
    };
  }
}