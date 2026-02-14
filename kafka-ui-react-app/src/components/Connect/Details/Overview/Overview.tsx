import React from 'react';
import * as C from 'components/common/Tag/Tag.styled';
import * as Metrics from 'components/common/Metrics';
import getTagColor from 'components/common/Tag/getTagColor';
import { RouterParamsClusterConnectConnector } from 'lib/paths';
import useAppParams from 'lib/hooks/useAppParams';
import {
  useConnector,
  useConnectorTasks,
} from 'lib/hooks/api/kafkaConnect';
import { ConnectorTaskStatus, Task } from 'generated-sources';

import getTaskMetrics from './getTaskMetrics';

const FAILURE_REASON_MAX_LENGTH = 180;

const getFailureReason = (tasks?: Task[]): string | null => {
  if (!tasks) {
    return null;
  }

  const trace = tasks.find(
    (task) =>
      task.status?.state === ConnectorTaskStatus.FAILED && task.status?.trace
  )?.status?.trace;

  if (!trace) {
    return null;
  }

  if (trace.length <= FAILURE_REASON_MAX_LENGTH) {
    return trace;
  }

  return `${trace.slice(0, FAILURE_REASON_MAX_LENGTH - 3)}...`;
};

const Overview: React.FC = () => {
  const routerProps = useAppParams<RouterParamsClusterConnectConnector>();

  const { data: connector, isError: isConnectorError } = useConnector(
    routerProps
  );
  const { data: tasks, isError: isTasksError } = useConnectorTasks(routerProps);

  if (!connector) {
    if (isConnectorError) {
      return (
        <Metrics.Wrapper>
          <Metrics.Section>
            <Metrics.Indicator label="State">
              Failed to load connector overview. Please check connector status.
            </Metrics.Indicator>
          </Metrics.Section>
        </Metrics.Wrapper>
      );
    }
    return null;
  }

  const { running, failed } = getTaskMetrics(tasks);
  const runningTasks = isTasksError ? '-' : running;
  const failedTasks = isTasksError ? '-' : failed;
  const hasFailedTasks = typeof failedTasks === 'number' && failedTasks > 0;
  const failureReason = getFailureReason(tasks);

  return (
    <Metrics.Wrapper>
      <Metrics.Section>
        {connector.status?.workerId && (
          <Metrics.Indicator label="Worker">
            {connector.status.workerId}
          </Metrics.Indicator>
        )}
        <Metrics.Indicator label="Type">{connector.type}</Metrics.Indicator>
        {connector.config['connector.class'] && (
          <Metrics.Indicator label="Class">
            {connector.config['connector.class']}
          </Metrics.Indicator>
        )}
        <Metrics.Indicator label="State">
          <C.Tag color={getTagColor(connector.status.state)}>
            {connector.status.state}
          </C.Tag>
        </Metrics.Indicator>
        <Metrics.Indicator label="Tasks Running">{runningTasks}</Metrics.Indicator>
        <Metrics.Indicator
          label="Tasks Failed"
          isAlert
          alertType={hasFailedTasks ? 'error' : 'success'}
        >
          {failedTasks}
        </Metrics.Indicator>
        <Metrics.Indicator label="Last Failure" title={failureReason || ''}>
          {isTasksError
            ? 'Failed to load task traces'
            : failureReason || 'No failed tasks'}
        </Metrics.Indicator>
      </Metrics.Section>
    </Metrics.Wrapper>
  );
};

export default Overview;
