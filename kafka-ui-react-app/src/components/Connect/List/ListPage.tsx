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
import WarningIcon from 'components/common/Icons/WarningIcon';
import { Action, ConnectorState, ResourceType } from 'generated-sources';
import { useConnectors } from 'lib/hooks/api/kafkaConnect';
import { splitConnectorsByFetchErrors } from 'components/Connect/connectFetchError';

import List from './List';
import * as S from './List.styled';

const ListPage: React.FC = () => {
  const { isReadOnly } = React.useContext(ClusterContext);
  const { clusterName } = useAppParams<ClusterNameRoute>();

  // Fetches all connectors from the API, without search criteria. Used to display general metrics.
  const { data: connectorsMetrics, isLoading } = useConnectors(clusterName);
  const { connectors: availableConnectors, connectFetchErrors } = React.useMemo(
    () => splitConnectorsByFetchErrors(connectorsMetrics),
    [connectorsMetrics]
  );
  const hasConnectFetchErrors = connectFetchErrors.length > 0;
  const isMetricsComplete =
    connectorsMetrics !== undefined && !hasConnectFetchErrors;

  const numberOfFailedConnectors = availableConnectors.filter(
    ({ status: { state } }) => state === ConnectorState.FAILED
  ).length;

  const numberOfFailedTasks = availableConnectors.reduce(
    (acc, metric) => acc + (metric.failedTasksCount ?? 0),
    0
  );

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
      <S.ConnectListContent>
        <S.ConnectMetricsBlock>
          <Metrics.Wrapper>
            <Metrics.Section>
              <Metrics.Indicator
                label="Connectors"
                title={
                  hasConnectFetchErrors
                    ? 'Unknown while one or more Connect clusters are unavailable'
                    : 'Total number of connectors'
                }
                fetching={isLoading}
                isAlert={hasConnectFetchErrors}
                alertType="warning"
              >
                {isMetricsComplete ? availableConnectors.length : '-'}
              </Metrics.Indicator>
              <Metrics.Indicator
                label="Failed Connectors"
                title="Number of failed connectors"
                fetching={isLoading}
                isAlert={hasConnectFetchErrors}
                alertType="warning"
              >
                {isMetricsComplete ? numberOfFailedConnectors : '-'}
              </Metrics.Indicator>
              <Metrics.Indicator
                label="Failed Tasks"
                title="Number of failed tasks"
                fetching={isLoading}
                isAlert={hasConnectFetchErrors}
                alertType="warning"
              >
                {isMetricsComplete ? numberOfFailedTasks : '-'}
              </Metrics.Indicator>
            </Metrics.Section>
          </Metrics.Wrapper>
        </S.ConnectMetricsBlock>
        {hasConnectFetchErrors && (
          <S.ConnectFetchErrorsWrapper role="alert">
            <S.ConnectFetchErrorsTitle>
              <WarningIcon />
              Connect cluster lookup failed
            </S.ConnectFetchErrorsTitle>
            <S.ConnectFetchErrorsDescription>
              <S.ConnectFetchErrorsList>
                {connectFetchErrors.map((error) => (
                  <li key={error.connectName}>
                    <strong>{error.connectName}</strong>: {error.message}
                  </li>
                ))}
              </S.ConnectFetchErrorsList>
            </S.ConnectFetchErrorsDescription>
          </S.ConnectFetchErrorsWrapper>
        )}
        <ControlPanelWrapper hasInput>
          <Search placeholder="Search by Connect Name, Status or Type" />
        </ControlPanelWrapper>
        <Suspense fallback={<PageLoader />}>
          <List />
        </Suspense>
      </S.ConnectListContent>
    </>
  );
};

export default ListPage;
