import type { RootEntity } from '../../domain/entities/RootEntity';
import { WorldClockRepository } from '../../infrastructure/repositories/WorldClockRepository';

export class GetWorldClockUseCase {
  private repository: WorldClockRepository;

  constructor(repository: WorldClockRepository) {
    this.repository = repository;
  }

  async execute(): Promise<RootEntity> {
    return await this.repository.getWorldClockData();
  }
}