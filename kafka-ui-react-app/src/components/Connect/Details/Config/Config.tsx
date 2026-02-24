import React from 'react';
import useAppParams from 'lib/hooks/useAppParams';
import { Controller, useForm } from 'react-hook-form';
import { ErrorMessage } from '@hookform/error-message';
import { yupResolver } from '@hookform/resolvers/yup';
import { RouterParamsClusterConnectConnector } from 'lib/paths';
import yup from 'lib/yupExtended';
import Editor from 'components/common/Editor/Editor';
import { Button } from 'components/common/Button/Button';
import {
  useConnectorConfig,
  useUpdateConnectorConfig,
} from 'lib/hooks/api/kafkaConnect';
import { getResponse } from 'lib/errorHandling';
import { AlertTriangle } from 'lucide-react';

import {
  ConnectEditWarningMessageStyled,
  ConnectEditWrapperStyled,
} from './Config.styled';

const validationSchema = yup.object().shape({
  config: yup.string().required().isJsonObject(),
});

interface FormValues {
  config: string;
}

interface ConfigFieldError {
  name: string;
  errors: string[];
}

const Config: React.FC = () => {
  const routerParams = useAppParams<RouterParamsClusterConnectConnector>();
  const { data: config } = useConnectorConfig(routerParams);
  const mutation = useUpdateConnectorConfig(routerParams);
  const [configErrors, setConfigErrors] = React.useState<ConfigFieldError[]>([]);
  const [globalError, setGlobalError] = React.useState<string | null>(null);

  const {
    handleSubmit,
    control,
    reset,
    formState: { isDirty, isSubmitting, isValid, errors },
    setValue,
  } = useForm<FormValues>({
    mode: 'onChange',
    resolver: yupResolver(validationSchema),
    defaultValues: {
      config: JSON.stringify(config, null, '\t'),
    },
  });

  React.useEffect(() => {
    if (config) {
      setValue('config', JSON.stringify(config, null, '\t'));
    }
  }, [config, setValue]);

  const fetchValidationErrors = async (
    parsedConfig: Record<string, string>
  ): Promise<boolean> => {
    const pluginName = parsedConfig['connector.class'];
    if (!pluginName) return false;

    try {
      const basePath = window.basePath || '';
      const url = `${basePath}/api/clusters/${encodeURIComponent(
        routerParams.clusterName
      )}/connects/${encodeURIComponent(
        routerParams.connectName
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
      return false;
    }
  };

  const onSubmit = async (values: FormValues) => {
    setConfigErrors([]);
    setGlobalError(null);

    try {
      const requestBody = JSON.parse(values.config.trim());
      await mutation.mutateAsync(requestBody);
      reset(values);
    } catch (e: any) {
      // 1. Try to fetch field-level validation errors
      let parsedConfig: Record<string, string> = {};
      try {
        parsedConfig = JSON.parse(values.config.trim());
      } catch {
        // ignore
      }
      const hasFieldErrors = await fetchValidationErrors(parsedConfig);

      // 2. Extract error message
      let message = '';
      if (e instanceof Response) {
        try {
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

      // 3. If field errors shown below, truncate to summary
      if (hasFieldErrors) {
        const match = message.match(/^(.*?\d+\s+error\(s\):?)/);
        if (match) {
          message = match[1];
        }
      }

      setGlobalError(message);
    }
  };

  const hasCredentials = JSON.stringify(config, null, '\t').includes(
    '"******"'
  );
  return (
    <ConnectEditWrapperStyled>
      {hasCredentials && (
        <ConnectEditWarningMessageStyled>
          Please replace ****** with the real credential values to avoid
          accidentally breaking your connector config!
        </ConnectEditWarningMessageStyled>
      )}
      <form onSubmit={handleSubmit(onSubmit)} aria-label="Edit connect form">
        <div>
          <Controller
            control={control}
            name="config"
            render={({ field }) => (
              <Editor {...field} readOnly={isSubmitting} />
            )}
          />
        </div>
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
        <Button
          buttonSize="M"
          buttonType="primary"
          type="submit"
          disabled={!isValid || isSubmitting || !isDirty}
        >
          Submit
        </Button>
      </form>
    </ConnectEditWrapperStyled>
  );
};

export default Config;
