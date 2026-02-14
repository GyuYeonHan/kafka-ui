import React, { Suspense } from 'react';
import useAppParams from 'lib/hooks/useAppParams';
import { clusterConnectorNewRelativePath, ClusterNameRoute } from 'lib/paths';
import ClusterContext from 'components/contexts/ClusterContext';
import Search from 'components/common/Search/Search';
import * as Metrics from 'components/common/Metrics';
import PageHeading from 'components/common/PageHeading/PageHeading';
import { ActionButton } from 'components/common/ActionComponent';
import { ControlPanelWrapper } from 'components/common/ControlPanel/ControlPanel.styled';
import PageLoader from 'components/common/PageLoader/PageLoader';
import { Action, ConnectorState, ResourceType } from 'generated-sources';
import { useConnectors } from 'lib/hooks/api/kafkaConnect';

import List from './List';

interface ConnectHealth {
  connect: string;
  connectorsCount: number;
  failedConnectorsCount: number;
  failedTasksCount: number;
}

const ListPage: React.FC = () => {
  const { isReadOnly } = React.useContext(ClusterContext);
  const { clusterName } = useAppParams<ClusterNameRoute>();

  // Fetches all connectors from the API, without search criteria. Used to display general metrics.
  const { data: connectorsMetrics, isLoading } = useConnectors(clusterName);

  const numberOfFailedConnectors = connectorsMetrics?.filter(
    ({ status: { state } }) =>
      state === ConnectorState.FAILED || state === ConnectorState.TASK_FAILED
  ).length;

  const numberOfFailedTasks = connectorsMetrics?.reduce(
    (acc, metric) => acc + (metric.failedTasksCount ?? 0),
    0
  );

  const connectsHealth = React.useMemo<ConnectHealth[]>(() => {
    if (!connectorsMetrics) {
      return [];
    }

    const grouped = new Map<string, ConnectHealth>();
    connectorsMetrics.forEach((connector) => {
      const connectName = connector.connect || 'unknown';
      const current = grouped.get(connectName) || {
        connect: connectName,
        connectorsCount: 0,
        failedConnectorsCount: 0,
        failedTasksCount: 0,
      };

      current.connectorsCount += 1;
      if (
        connector.status.state === ConnectorState.FAILED ||
        connector.status.state === ConnectorState.TASK_FAILED
      ) {
        current.failedConnectorsCount += 1;
      }
      current.failedTasksCount += connector.failedTasksCount || 0;

      grouped.set(connectName, current);
    });

    return Array.from(grouped.values()).sort((a, b) =>
      a.connect.localeCompare(b.connect)
    );
  }, [connectorsMetrics]);

  return (
    <>
      <PageHeading text="Connectors">
        {!isReadOnly && (
          <ActionButton
            buttonType="primary"
            buttonSize="M"
            to={clusterConnectorNewRelativePath}
            permission={{
              resource: ResourceType.CONNECT,
              action: Action.CREATE,
            }}
          >
            Create Connector
          </ActionButton>
        )}
      </PageHeading>
      <Metrics.Wrapper>
        <Metrics.Section>
          <Metrics.Indicator
            label="Connectors"
            title="Total number of connectors"
            fetching={isLoading}
          >
            {connectorsMetrics?.length || '-'}
          </Metrics.Indicator>
          <Metrics.Indicator
            label="Failed Connectors"
            title="Number of failed connectors"
            fetching={isLoading}
          >
            {numberOfFailedConnectors ?? '-'}
          </Metrics.Indicator>
          <Metrics.Indicator
            label="Failed Tasks"
            title="Number of failed tasks"
            fetching={isLoading}
          >
            {numberOfFailedTasks ?? '-'}
          </Metrics.Indicator>
        </Metrics.Section>
      </Metrics.Wrapper>
      {connectsHealth.length > 0 && (
        <Metrics.Wrapper>
          <Metrics.Section title="Connect Health">
            {connectsHealth.map((health) => {
              const isFailed =
                health.failedConnectorsCount > 0 || health.failedTasksCount > 0;
              return (
                <Metrics.Indicator
                  key={health.connect}
                  label={`Connect: ${health.connect}`}
                  isAlert
                  alertType={isFailed ? 'error' : 'success'}
                  title={`Health summary for ${health.connect}`}
                >
                  {`${health.connectorsCount} connectors / ${health.failedConnectorsCount} failed connectors / ${health.failedTasksCount} failed tasks`}
                </Metrics.Indicator>
              );
            })}
          </Metrics.Section>
        </Metrics.Wrapper>
      )}
      <ControlPanelWrapper hasInput>
        <Search placeholder="Search by Connect Name, Status or Type" />
      </ControlPanelWrapper>
      <Suspense fallback={<PageLoader />}>
        <List />
      </Suspense>
    </>
  );
};

export default ListPage;
