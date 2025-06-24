# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Refine application - a React-based framework for building data-intensive applications like admin panels and internal tools. The project uses TypeScript, Vite, and Tailwind CSS.

## Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run production build
npm run start

# Run Refine CLI for code generation and scaffolding
npm run refine
```

## Architecture

### Refine Framework Structure
The application is built around Refine's opinionated structure:

- **App.tsx**: Central configuration hub that sets up all Refine providers:
  - `dataProvider`: Configured with @refinedev/simple-rest pointing to https://api.fake-rest.refine.dev
  - `routerProvider`: Uses React Router v7 bindings
  - Built-in features: devtools, Kbar command palette, document title management, unsaved changes warnings

### Component Organization
- `/src/components/`: Shared UI components
  - `layout/`: Main application layout wrapper
  - `menu/`: Navigation menu component
  - `breadcrumb/`: Breadcrumb navigation component

### Key Architectural Patterns
1. **Resource-based routing**: Refine uses a resource-centric approach where each data entity (like "products", "users") is a resource with standard CRUD operations
2. **Provider pattern**: All major functionality (data fetching, routing, authentication) is handled through providers configured in App.tsx
3. **Component composition**: Layout components wrap around resource pages to provide consistent UI structure

## Development Notes

- **TypeScript**: Strict mode is enabled - ensure all props and return types are properly typed
- **Styling**: Use Tailwind CSS utilities for styling. The project is configured with Tailwind's default setup
- **Data Provider**: Currently uses a fake REST API. When implementing real data fetching, replace the dataProvider configuration in App.tsx
- **No testing framework**: Tests need to be set up if required (consider Vitest for Vite compatibility)