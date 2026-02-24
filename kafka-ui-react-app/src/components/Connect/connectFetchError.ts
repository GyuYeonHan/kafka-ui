import { FullConnectorInfo } from 'generated-sources';

export const CONNECT_FETCH_ERROR_CONNECTOR_NAME_PREFIX =
  '__connect_fetch_error__:';
export const CONNECT_CLUSTER_UNAVAILABLE_MESSAGE =
  'Connect cluster unavailable';

export const isConnectFetchErrorPlaceholder = (connectorName: string) =>
  connectorName.startsWith(CONNECT_FETCH_ERROR_CONNECTOR_NAME_PREFIX);

export interface ConnectFetchError {
  connectName: string;
  message: string;
}

export interface ConnectorsWithFetchErrors {
  connectors: FullConnectorInfo[];
  connectFetchErrors: ConnectFetchError[];
}

export const splitConnectorsByFetchErrors = (
  connectors: FullConnectorInfo[] = []
): ConnectorsWithFetchErrors => {
  const availableConnectors: FullConnectorInfo[] = [];
  const connectFetchErrorsByName = new Map<string, ConnectFetchError>();

  connectors.forEach((connector) => {
    const connectorName = connector.name || '';
    if (!isConnectFetchErrorPlaceholder(connectorName)) {
      availableConnectors.push(connector);
      return;
    }

    const connectName = connector.connect || '';
    if (connectFetchErrorsByName.has(connectName)) {
      return;
    }

    connectFetchErrorsByName.set(connectName, {
      connectName,
      message: connector.connectorClass || CONNECT_CLUSTER_UNAVAILABLE_MESSAGE,
    });
  });

  return {
    connectors: availableConnectors,
    connectFetchErrors: Array.from(connectFetchErrorsByName.values()),
  };
};
