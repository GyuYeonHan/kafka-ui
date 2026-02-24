import React from 'react';
import useAppParams from 'lib/hooks/useAppParams';
import { clusterConnectConnectorPath, ClusterNameRoute } from 'lib/paths';
import Table, { TagCell } from 'components/common/NewTable';
import { ConnectorState, FullConnectorInfo } from 'generated-sources';
import { useConnectors } from 'lib/hooks/api/kafkaConnect';
import { ColumnDef } from '@tanstack/react-table';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { splitConnectorsByFetchErrors } from 'components/Connect/connectFetchError';

import ActionsCell from './ActionsCell';
import TopicsCell from './TopicsCell';
import RunningTasksCell from './RunningTasksCell';

const List: React.FC = () => {
  const navigate = useNavigate();
  const { clusterName } = useAppParams<ClusterNameRoute>();
  const [searchParams] = useSearchParams();
  const search = searchParams.get('q') || undefined;
  const { data: connectors } = useConnectors(clusterName, search);
  const { connectors: availableConnectors } = React.useMemo(
    () => splitConnectorsByFetchErrors(connectors),
    [connectors]
  );

  const columns = React.useMemo<ColumnDef<FullConnectorInfo>[]>(
    () => [
      { header: 'Name', accessorKey: 'name' },
      { header: 'Connect', accessorKey: 'connect' },
      { header: 'Type', accessorKey: 'type' },
      { header: 'Plugin', accessorKey: 'connectorClass' },
      { header: 'Topics', cell: TopicsCell },
      { header: 'Status', accessorKey: 'status.state', cell: TagCell },
      { header: 'Running Tasks', cell: RunningTasksCell },
      { header: '', id: 'action', cell: ActionsCell },
    ],
    []
  );

  return (
    <Table
      data={availableConnectors}
      columns={columns}
      enableSorting
      isRowClickable={({ original: { status } }) =>
        status?.state !== ConnectorState.FETCH_FAILED
      }
      onRowClick={({ original: { connect, name, status } }) => {
        if (status?.state === ConnectorState.FETCH_FAILED) {
          return;
        }

        navigate(clusterConnectConnectorPath(clusterName, connect, name));
      }}
      emptyMessage="No connectors found"
    />
  );
};

export default List;
