import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAppParams from 'lib/hooks/useAppParams';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { ErrorMessage } from '@hookform/error-message';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  clusterConnectConnectorPath,
  clusterConnectorsPath,
  ClusterNameRoute,
} from 'lib/paths';
import yup from 'lib/yupExtended';
import Editor from 'components/common/Editor/Editor';
import Select from 'components/common/Select/Select';
import { FormError } from 'components/common/Input/Input.styled';
import Input from 'components/common/Input/Input';
import { Button } from 'components/common/Button/Button';
import PageHeading from 'components/common/PageHeading/PageHeading';
import Heading from 'components/common/heading/Heading.styled';
import { useQueryClient } from '@tanstack/react-query';
import { useConnects, useCreateConnector } from 'lib/hooks/api/kafkaConnect';
import get from 'lodash/get';
import { Connect, ConnectorPluginConfig } from 'generated-sources';
import { kafkaConnectApiClient as connectApi } from 'lib/api';
import { showAlert, getResponse, showServerError } from 'lib/errorHandling';
import { AlertTriangle } from 'lucide-react';

import * as S from './New.styled';

const validationSchema = yup.object().shape({
  name: yup.string().required(),
  config: yup.string().required().isJsonObject(),
});

interface FormValues {
  connectName: Connect['name'];
  name: string;
  config: string;
}

interface ConfigFieldError {
  name: string;
  errors: string[];
}

const New: React.FC = () => {
  const { clusterName } = useAppParams<ClusterNameRoute>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: connects = [] } = useConnects(clusterName);
  const mutation = useCreateConnector(clusterName);
  const [configErrors, setConfigErrors] = React.useState<ConfigFieldError[]>([]);
  const [globalError, setGlobalError] = React.useState<string | null>(null);

  const methods = useForm<FormValues>({
    mode: 'all',
    resolver: yupResolver(validationSchema),
    defaultValues: {
      connectName: get(connects, '0.name', ''),
      name: '',
      config: '',
    },
  });
  const {
    handleSubmit,
    control,
    formState: { isDirty, isSubmitting, isValid, errors },
    getValues,
    setValue,
  } = methods;

  React.useEffect(() => {
    if (connects && connects.length > 0 && !getValues().connectName) {
      setValue('connectName', connects[0].name);
    }
  }, [connects, getValues, setValue]);

  const fetchValidationErrors = async (
    connectName: string,
    parsedConfig: Record<string, string>
  ): Promise<boolean> => {
    const pluginName = parsedConfig['connector.class'];
    if (!pluginName) return false;

    try {
      const basePath = window.basePath || '';
      const url = `${basePath}/api/clusters/${encodeURIComponent(
        clusterName
      )}/connects/${encodeURIComponent(
        connectName
      )}/plugins/${encodeURIComponent(pluginName)}/config/validate`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(parsedConfig),
      });

      if (!response.ok) return false;

      const validation = await response.json();
      const configs = validation.configs ?? [];

      const fieldErrors: ConfigFieldError[] = configs
        .filter(
          (c: any) =>
            c.value &&
            (c.value.errors ?? []) &&
            (c.value.errors ?? []).length > 0
        )
        .map((c: any) => ({
          name: c.value?.name || 'unknown',
          errors: c.value?.errors || [],
        }));

      if (fieldErrors.length > 0) {
        setConfigErrors(fieldErrors);
        return true;
      } else {
        setConfigErrors([]);
        return false;
      }
    } catch {
      // Ignore validation fetch errors
      return false;
    }
  };

  const onSubmit = async (values: FormValues) => {
    setConfigErrors([]);
    setGlobalError(null);

    let parsedConfig: Record<string, string>;
    try {
      parsedConfig = JSON.parse(values.config.trim());
    } catch {
      return;
    }

    try {
      const connector = await mutation.createResource({
        connectName: values.connectName,
        newConnector: {
          name: values.name,
          config: parsedConfig,
        },
      });

      if (connector) {
        navigate(
          clusterConnectConnectorPath(
            clusterName,
            connector.connect,
            connector.name
          )
        );
      }
    } catch (e: any) {
      // 1. Fetch field-level validation errors
      const hasFieldErrors = await fetchValidationErrors(values.connectName, parsedConfig);

      // 2. Extract error message (handle JSON or Plaintext)
      let message = '';
      if (e instanceof Response) {
        try {
          // Use clone to preserve the stream. 
          const text = await e.clone().text();
          try {
            const body = JSON.parse(text);
            message = body.message || text;
          } catch {
            message = text;
          }
        } catch {
          message = `${e.status} ${e.statusText}`;
        }
      } else {
        message = e.message || 'Unknown error';
      }

      // 3. If field-level errors are shown below, truncate to just the summary
      if (hasFieldErrors) {
        const match = message.match(/^(.*?\d+\s+error\(s\):?)/);
        if (match) {
          message = match[1];
        }
      }

      setGlobalError(message);
    }
  };

  const connectOptions = connects.map(({ name: connectName }) => ({
    value: connectName,
    label: connectName,
  }));

  return (
    <FormProvider {...methods}>
      <PageHeading
        text="Create new connector"
        backTo={clusterConnectorsPath(clusterName)}
        backText="Connectors"
      />
      <S.NewConnectFormStyled
        onSubmit={handleSubmit(onSubmit)}
        aria-label="Create connect form"
      >
        <S.Filed $hidden={connects?.length <= 1}>
          <Heading level={3}>Connect *</Heading>
          <Controller
            defaultValue={connectOptions[0]?.value}
            control={control}
            name="connectName"
            render={({ field: { name, onChange } }) => (
              <Select
                selectSize="M"
                name={name}
                disabled={isSubmitting}
                onChange={onChange}
                value={connectOptions[0]?.value}
                minWidth="100%"
                options={connectOptions}
              />
            )}
          />
          <FormError>
            <ErrorMessage errors={errors} name="connectName" />
          </FormError>
        </S.Filed>

        <div>
          <Heading level={3}>Name</Heading>
          <Input
            inputSize="M"
            placeholder="Connector Name"
            name="name"
            autoFocus
            autoComplete="off"
            disabled={isSubmitting}
          />
          <FormError>
            <ErrorMessage errors={errors} name="name" />
          </FormError>
        </div>

        <div>
          <Heading level={3}>Config</Heading>
          <Controller
            control={control}
            name="config"
            render={({ field }) => (
              <Editor {...field} readOnly={isSubmitting} ref={null} />
            )}
          />
          {(configErrors.length > 0 || globalError || errors.config) && (
            <div
              style={{
                marginTop: '12px',
                padding: '16px',
                background: 'rgba(255, 77, 79, 0.05)',
                border: '1px solid rgba(255, 77, 79, 0.2)',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: '12px',
                  color: '#ff4d4f',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <AlertTriangle size={20} /> Configuration Errors
              </div>

              {/* 1. Client-side Syntax Errors (yup) */}
              {errors.config && (
                <div style={{ marginBottom: (globalError || configErrors.length > 0) ? '12px' : 0 }}>
                  <strong style={{ color: '#ff4d4f', display: 'block', marginBottom: '4px' }}>Syntax Error</strong>
                  <div style={{ color: '#ff4d4f', fontSize: '13px', background: 'white', padding: '8px', borderRadius: '4px', borderLeft: '3px solid #ff4d4f' }}>
                    {errors.config.message}
                  </div>
                </div>
              )}

              {/* 2. Server-side Global Errors (e.g. Name mismatch) */}
              {globalError && !errors.config && (
                <div style={{ color: '#ff4d4f', fontSize: '13px', marginBottom: configErrors.length > 0 ? '12px' : 0 }}>
                  {globalError}
                </div>
              )}

              {/* 3. Server-side Field Validation Errors */}
              {configErrors.length > 0 && !errors.config && configErrors.map((fieldError) => (
                <div
                  key={fieldError.name}
                  style={{ marginBottom: '8px' }}
                >
                  <strong style={{ fontSize: '13px' }}>{fieldError.name}</strong>
                  <ul
                    style={{
                      margin: '4px 0 0 16px',
                      padding: 0,
                      listStyle: 'disc',
                    }}
                  >
                    {fieldError.errors.map((err) => (
                      <li
                        key={err}
                        style={{ color: '#ff4d4f', fontSize: '13px' }}
                      >
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
        <Button
          buttonSize="M"
          buttonType="primary"
          type="submit"
          disabled={!isValid || isSubmitting}
        >
          Submit
        </Button>
      </S.NewConnectFormStyled>
    </FormProvider>
  );
};

export default New;
