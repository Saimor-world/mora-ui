import { getConnectors, markConnectorState, syncConnector, testConnection, type ConnectorStatus } from '@/lib/connectors';
const connector: ConnectorStatus = { id: 'test', type: 'email', label: 'Test', mode: 'mock', state: 'connected', lastSyncAt: '2026-10-28', objectCount: 99 };
afterEach(() => localStorage.clear());
it('does not treat cached connection state as a live verification', () => {
  localStorage.setItem('mora_connector_statuses', JSON.stringify([connector]));
  expect(getConnectors()[0]).toMatchObject({ state: 'unknown', objectCount: null, lastSyncAt: null });
});
it('does not manufacture successful tests or synchronization', async () => {
  expect(await testConnection(connector)).toMatchObject({ state: 'unknown', objectCount: null });
  expect(await syncConnector(connector)).toMatchObject({ state: 'unknown', objectCount: null });
  expect(markConnectorState(connector, 'connected').state).toBe('unknown');
});
