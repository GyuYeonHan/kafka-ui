package com.provectus.kafka.ui.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.provectus.kafka.ui.connect.model.ConnectorTopics;
import com.provectus.kafka.ui.mapper.ClusterMapper;
import com.provectus.kafka.ui.mapper.KafkaConnectMapper;
import com.provectus.kafka.ui.model.ConnectDTO;
import com.provectus.kafka.ui.model.ConnectorDTO;
import com.provectus.kafka.ui.model.FullConnectorInfoDTO;
import com.provectus.kafka.ui.model.KafkaCluster;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

class KafkaConnectServiceTest {

  private final ClusterMapper clusterMapper = mock(ClusterMapper.class);
  private final KafkaConnectMapper kafkaConnectMapper = mock(KafkaConnectMapper.class);
  private final KafkaConfigSanitizer kafkaConfigSanitizer = mock(KafkaConfigSanitizer.class);
  private final KafkaConnectService kafkaConnectService = spy(
      new KafkaConnectService(
          clusterMapper,
          kafkaConnectMapper,
          new ObjectMapper(),
          kafkaConfigSanitizer
      )
  );

  @Test
  void getAllConnectorsSkipsBrokenConnectorAndReturnsHealthyOnes() {
    KafkaCluster cluster = KafkaCluster.builder()
        .name("test-cluster")
        .build();

    ConnectDTO connect = new ConnectDTO();
    connect.setName("connect-A");

    ConnectorDTO healthy = new ConnectorDTO();
    healthy.setName("healthy-connector");
    healthy.setConnect("connect-A");

    FullConnectorInfoDTO expected = new FullConnectorInfoDTO();
    expected.setName("healthy-connector");

    doReturn(Flux.just(connect))
        .when(kafkaConnectService)
        .getConnects(cluster);
    doReturn(Flux.just("healthy-connector", "broken-connector"))
        .when(kafkaConnectService)
        .getConnectorNamesWithErrorsSuppress(cluster, "connect-A");

    doReturn(Mono.just(healthy))
        .when(kafkaConnectService)
        .getConnector(cluster, "connect-A", "healthy-connector");
    doReturn(Mono.just(Map.of("connector.class", "sample.class")))
        .when(kafkaConnectService)
        .getConnectorConfig(cluster, "connect-A", "healthy-connector");
    doReturn(Flux.empty())
        .when(kafkaConnectService)
        .getConnectorTasks(cluster, "connect-A", "healthy-connector");
    doReturn(Mono.just(new ConnectorTopics().topics(List.of("topic-a"))))
        .when(kafkaConnectService)
        .getConnectorTopics(cluster, "connect-A", "healthy-connector");

    doReturn(Mono.error(new RuntimeException("boom")))
        .when(kafkaConnectService)
        .getConnector(cluster, "connect-A", "broken-connector");

    when(kafkaConnectMapper.fullConnectorInfo(any())).thenReturn(expected);

    StepVerifier.create(kafkaConnectService.getAllConnectors(cluster, null))
        .expectNext(expected)
        .verifyComplete();

    verify(kafkaConnectMapper, times(1)).fullConnectorInfo(any());
  }

  @Test
  void getConnectorNamesWithErrorsSuppressReturnsEmptyOnTimeout() {
    KafkaCluster cluster = KafkaCluster.builder()
        .name("test-cluster")
        .build();

    doReturn(Flux.never())
        .when(kafkaConnectService)
        .getConnectorNames(cluster, "connect-A");

    StepVerifier.withVirtualTime(
            () -> kafkaConnectService.getConnectorNamesWithErrorsSuppress(cluster, "connect-A"))
        .thenAwait(Duration.ofSeconds(16))
        .verifyComplete();
  }
}
