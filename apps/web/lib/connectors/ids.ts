// The apps in the catalog (catalog.ts), on their own so the portrait's schema can name them as
// evidence sources without pulling in the readers.
export const CONNECTOR_IDS = ['notion', 'github', 'google-drive', 'figma', 'canva', 'dropbox'] as const;
export type ConnectorId = (typeof CONNECTOR_IDS)[number];
