import React from 'react';
import { connectors } from 'lib/fixtures/kafkaConnect';
import ClusterContext, {
  ContextProps,
  initialValue,
} from 'components/contexts/ClusterContext';
import ListPage from 'components/Connect/List/ListPage';
import { screen, within } from '@testing-library/react';
import { render, WithRoute } from 'lib/testHelpers';
import { clusterConnectorsPath } from 'lib/paths';
import { useConnectors } from 'lib/hooks/api/kafkaConnect';
import {
  ConnectorState,
  ConnectorType,
  FullConnectorInfo,
} from 'generated-sources';

jest.mock('components/Connect/List/List', () => () => (
  <div>Connectors List</div>
));

jest.mock('lib/hooks/api/kafkaConnect', () => ({
  useConnectors: jest.fn(),
}));

jest.mock('components/common/Icons/SpinnerIcon', () => () => 'progressbar');

const clusterName = 'local';

describe('Connectors List Page', () => {
  beforeEach(() => {
    (useConnectors as jest.Mock).mockImplementation(() => ({
      isLoading: false,
      data: [],
    }));
  });

  const renderComponent = async (contextValue: ContextProps = initialValue) =>
    render(
      <ClusterContext.Provider value={contextValue}>
        <WithRoute path={clusterConnectorsPath()}>
          <ListPage />
        </WithRoute>
      </ClusterContext.Provider>,
      { initialEntries: [clusterConnectorsPath(clusterName)] }
    );

  describe('Heading', () => {
    it('renders header without create button for readonly cluster', async () => {
      await renderComponent({ ...initialValue, isReadOnly: true });
      expect(
        screen.getByRole('heading', { name: 'Connectors' })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: 'Create Connector' })
      ).not.toBeInTheDocument();
    });

    it('renders header with create button for read/write cluster', async () => {
      await renderComponent();
      expect(
        screen.getByRole('heading', { name: 'Connectors' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'Create Connector' })
      ).toBeInTheDocument();
    });
  });

  it('renders search input', async () => {
    await renderComponent();
    expect(
      screen.getByPlaceholderText('Search by Connect Name, Status or Type')
    ).toBeInTheDocument();
  });

  it('renders list', async () => {
    await renderComponent();
    expect(screen.getByText('Connectors List')).toBeInTheDocument();
  });

  describe('Metrics', () => {
    it('renders indicators in loading state', async () => {
      (useConnectors as jest.Mock).mockImplementation(() => ({
        isLoading: true,
        data: connectors,
      }));

      await renderComponent();
      const metrics = screen.getByRole('group');
      expect(metrics).toBeInTheDocument();
      expect(within(metrics).getAllByText('progressbar').length).toEqual(3);
    });

    it('renders indicators for empty list of connectors', async () => {
      await renderComponent();
      const metrics = screen.getByRole('group');
      expect(metrics).toBeInTheDocument();

      const connectorsIndicator = within(metrics).getByTitle(
        'Total number of connectors'
      );
      expect(connectorsIndicator).toBeInTheDocument();
      expect(connectorsIndicator).toHaveTextContent('Connectors 0');

      const failedConnectorsIndicator = within(metrics).getByTitle(
        'Number of failed connectors'
      );
      expect(failedConnectorsIndicator).toBeInTheDocument();
      expect(failedConnectorsIndicator).toHaveTextContent(
        'Failed Connectors 0'
      );

      const failedTasksIndicator = within(metrics).getByTitle(
        'Number of failed tasks'
      );
      expect(failedTasksIndicator).toBeInTheDocument();
      expect(failedTasksIndicator).toHaveTextContent('Failed Tasks 0');
    });

    it('renders indicators when connectors list is undefined', async () => {
      (useConnectors as jest.Mock).mockImplementation(() => ({
        isFetching: false,
        data: undefined,
      }));

      await renderComponent();
      const metrics = screen.getByRole('group');
      expect(metrics).toBeInTheDocument();

      const connectorsIndicator = within(metrics).getByTitle(
        'Total number of connectors'
      );
      expect(connectorsIndicator).toBeInTheDocument();
      expect(connectorsIndicator).toHaveTextContent('Connectors -');

      const failedConnectorsIndicator = within(metrics).getByTitle(
        'Number of failed connectors'
      );
      expect(failedConnectorsIndicator).toBeInTheDocument();
      expect(failedConnectorsIndicator).toHaveTextContent(
        'Failed Connectors -'
      );

      const failedTasksIndicator = within(metrics).getByTitle(
        'Number of failed tasks'
      );
      expect(failedTasksIndicator).toBeInTheDocument();
      expect(failedTasksIndicator).toHaveTextContent('Failed Tasks -');
    });

    it('renders indicators list of connectors', async () => {
      (useConnectors as jest.Mock).mockImplementation(() => ({
        isLoading: false,
        data: connectors,
      }));

      await renderComponent();

      const metrics = screen.getByRole('group');
      expect(metrics).toBeInTheDocument();

      const connectorsIndicator = within(metrics).getByTitle(
        'Total number of connectors'
      );
      expect(connectorsIndicator).toBeInTheDocument();
      expect(connectorsIndicator).toHaveTextContent(
        `Connectors ${connectors.length}`
      );

      const failedConnectorsIndicator = within(metrics).getByTitle(
        'Number of failed connectors'
      );
      expect(failedConnectorsIndicator).toBeInTheDocument();
      expect(failedConnectorsIndicator).toHaveTextContent(
        'Failed Connectors 1'
      );

      const failedTasksIndicator = within(metrics).getByTitle(
        'Number of failed tasks'
      );
      expect(failedTasksIndicator).toBeInTheDocument();
      expect(failedTasksIndicator).toHaveTextContent('Failed Tasks 1');
    });

    it('renders warning and unknown metrics when connect cluster lookup fails', async () => {
      const connectErrorPlaceholder: FullConnectorInfo = {
        connect: 'broken-connect',
        name: '__connect_fetch_error__:broken-connect',
        connectorClass: 'Connect cluster unavailable',
        type: ConnectorType.SOURCE,
        topics: [],
        status: {
          state: ConnectorState.FETCH_FAILED,
        },
        tasksCount: 0,
        failedTasksCount: 0,
      };
      (useConnectors as jest.Mock).mockImplementation(() => ({
        isLoading: false,
        data: [...connectors, connectErrorPlaceholder],
      }));

      await renderComponent();

      expect(
        screen.getByText('Connect cluster lookup failed')
      ).toBeInTheDocument();
      expect(screen.getByText(/broken-connect/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Connect cluster unavailable/i)
      ).toBeInTheDocument();

      const metrics = screen.getByRole('group');
      expect(metrics).toBeInTheDocument();

      const connectorsIndicator = within(metrics).getByTitle(
        'Unknown while one or more Connect clusters are unavailable'
      );
      expect(connectorsIndicator).toHaveTextContent('Connectors -');

      const failedConnectorsIndicator = within(metrics).getByTitle(
        'Number of failed connectors'
      );
      expect(failedConnectorsIndicator).toHaveTextContent(
        'Failed Connectors -'
      );

      const failedTasksIndicator = within(metrics).getByTitle(
        'Number of failed tasks'
      );
      expect(failedTasksIndicator).toHaveTextContent('Failed Tasks -');
    });
  });
});
