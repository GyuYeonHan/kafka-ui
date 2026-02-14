import React from 'react';
import { FullConnectorInfo } from 'generated-sources';
import { CellContext } from '@tanstack/react-table';
import { Tag } from 'components/common/Tag/Tag.styled';

const FailedTasksCell: React.FC<CellContext<FullConnectorInfo, unknown>> = ({
  row,
}) => {
  const failedTasksCount = row.original.failedTasksCount || 0;
  const color = failedTasksCount > 0 ? 'red' : 'gray';

  return <Tag color={color}>{failedTasksCount}</Tag>;
};

export default FailedTasksCell;
