package com.provectus.kafka.ui.mapper;

import com.provectus.kafka.ui.connect.model.ConnectorStatusConnector;
import com.provectus.kafka.ui.connect.model.ConnectorTask;
import com.provectus.kafka.ui.connect.model.NewConnector;
import com.provectus.kafka.ui.model.ConnectorDTO;
import com.provectus.kafka.ui.model.ConnectorPluginConfigValidationResponseDTO;
import com.provectus.kafka.ui.model.ConnectorPluginDTO;
import com.provectus.kafka.ui.model.ConnectorStateDTO;
import com.provectus.kafka.ui.model.ConnectorStatusDTO;
import com.provectus.kafka.ui.model.ConnectorTaskStatusDTO;
import com.provectus.kafka.ui.model.ConnectorTypeDTO;
import com.provectus.kafka.ui.model.FullConnectorInfoDTO;
import com.provectus.kafka.ui.model.TaskDTO;
import com.provectus.kafka.ui.model.TaskStatusDTO;
import com.provectus.kafka.ui.model.connect.InternalConnectInfo;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface KafkaConnectMapper {
  NewConnector toClient(com.provectus.kafka.ui.model.NewConnectorDTO newConnector);

  ConnectorDTO fromClient(com.provectus.kafka.ui.connect.model.Connector connector);

  ConnectorStatusDTO fromClient(ConnectorStatusConnector connectorStatus);

  TaskDTO fromClient(ConnectorTask connectorTask);

  TaskStatusDTO fromClient(com.provectus.kafka.ui.connect.model.TaskStatus taskStatus);

  ConnectorPluginDTO fromClient(
      com.provectus.kafka.ui.connect.model.ConnectorPlugin connectorPlugin);

  ConnectorPluginConfigValidationResponseDTO fromClient(
      com.provectus.kafka.ui.connect.model.ConnectorPluginConfigValidationResponse
          connectorPluginConfigValidationResponse);

  default FullConnectorInfoDTO fullConnectorInfo(InternalConnectInfo connectInfo) {
    ConnectorDTO connector = Optional.ofNullable(connectInfo.getConnector()).orElseGet(ConnectorDTO::new);
    List<TaskDTO> tasks = Optional.ofNullable(connectInfo.getTasks()).orElse(List.of());
    Map<String, Object> config = Optional.ofNullable(connectInfo.getConfig()).orElse(Map.of());
    ConnectorStatusDTO status = Optional.ofNullable(connector.getStatus())
        .orElseGet(() -> new ConnectorStatusDTO().state(ConnectorStateDTO.FETCH_FAILED));
    ConnectorTypeDTO type = Optional.ofNullable(connector.getType()).orElse(ConnectorTypeDTO.SOURCE);

    int failedTasksCount = (int) tasks.stream()
        .map(TaskDTO::getStatus)
        .filter(s -> s != null)
        .map(TaskStatusDTO::getState)
        .filter(ConnectorTaskStatusDTO.FAILED::equals)
        .count();

    return new FullConnectorInfoDTO()
        .connect(connector.getConnect())
        .name(connector.getName())
        .connectorClass((String) config.get("connector.class"))
        .type(type)
        .topics(connectInfo.getTopics())
        .status(status)
        .tasksCount(tasks.size())
        .failedTasksCount(failedTasksCount);
  }
}
