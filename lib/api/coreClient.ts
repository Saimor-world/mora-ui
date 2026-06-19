// lib/api/coreClient.ts
// Barrel re-export — maintains backward compatibility for all existing consumers.
// New code should import directly from the specific client module instead:
//   import { fetchCompanies } from '@/lib/api/orgClient';
//   import { coreGet } from '@/lib/api/http';

export * from './http';
export * from './authClient';
export * from './demoClient';
export * from './statsClient';
export * from './orgClient';
export * from './adminClient';
export * from './contentClient';
export * from './signalsClient';
export * from './searchClient';
export * from './memoryClient';
export * from './perfClient';
export * from './workSessionClient';
export * from './terminalClient';
export * from './desktopLayoutClient';
export * from './userSettingsClient';
