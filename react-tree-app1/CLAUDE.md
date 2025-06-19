# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based full-stack web application with a monorepo structure containing:
- `web-frontend`: React application built with Vite
- `web-backend`: Express server serving the frontend build artifacts

The application displays world clock times in a hierarchical structure following Domain-Driven Design (DDD) with layered architecture.

## Common Development Commands

### Frontend (web-frontend)
```bash
cd web-frontend
npm run dev      # Start development server
npm run build    # Build production bundle
npm run preview  # Preview production build
```

### Backend (web-backend)
```bash
cd web-backend
npm run dev      # Start development server with nodemon
npm run build    # Compile TypeScript to JavaScript
npm run start    # Run production server
```

## Architecture

### Frontend Structure
The frontend follows a layered architecture:
- **Domain Layer** (`src/domain/entities/`): Core business entities (RootEntity → AreaEntity → CountryEntity → CityEntity)
- **Application Layer** (`src/application/use-cases/`): Business logic and use cases
- **Infrastructure Layer** (`src/infrastructure/repositories/`): Data access and external services
- **Presentation Layer** (`src/presentation/components/`): React components in hierarchical structure

### Key Technical Details
- TypeScript configuration uses `verbatimModuleSyntax`, requiring type-only imports for interfaces
- Frontend uses React 19.1.0 with function components
- Build tool is Vite with TypeScript support
- CSS styling is inline within components (no external CSS framework)

## Development Workflow
1. Frontend development: Run `npm run dev` in web-frontend directory
2. Backend serves the frontend build: First build frontend with `npm run build`, then run backend
3. The Express server serves the frontend build artifacts from `web-frontend/dist`