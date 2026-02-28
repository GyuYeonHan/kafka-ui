import React from 'react';
import useAppParams from 'lib/hooks/useAppParams';
import { Controller, useForm } from 'react-hook-form';
import { ErrorMessage } from '@hookform/error-message';
import { yupResolver } from '@hookform/resolvers/yup';
import { RouterParamsClusterConnectConnector } from 'lib/paths';
import yup from 'lib/yupExtended';
import Editor from 'components/common/Editor/Editor';
import { Button } from 'components/common/Button/Button';
import { FormError } from 'components/common/Input/Input.styled';
import {
  useConnectorConfig,
  useUpdateConnectorConfig,
} from 'lib/hooks/api/kafkaConnect';

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

const getErrorMessage = async (error: unknown): Promise<string> => {
  if (error instanceof Response) {
    try {
      const body = await error.json();
      if (body?.message) {
        return body.message;
      }
    } catch {
      // do nothing
    }
    return `${error.status} ${error.statusText}`;
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return 'Failed to update connector config';
};

const Config: React.FC = () => {
  const routerParams = useAppParams<RouterParamsClusterConnectConnector>();
  const {
    data: config,
    isError: isConfigError,
    isLoading: isConfigLoading,
    isFetching: isConfigFetching,
  } = useConnectorConfig(routerParams);
  const isConfigPending = isConfigLoading || (isConfigFetching && !config);
  const mutation = useUpdateConnectorConfig(routerParams);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

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
      config: JSON.stringify(config || {}, null, '\t'),
    },
  });

  React.useEffect(() => {
    if (config) {
      setValue('config', JSON.stringify(config, null, '\t'));
    }
  }, [config, setValue]);

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    try {
      const requestBody = JSON.parse(values.config.trim());
      await mutation.mutateAsync(requestBody);
      reset(values);
    } catch (e) {
      setSubmitError(await getErrorMessage(e));
    }
  };

  if (isConfigPending && !config) {
    return (
      <ConnectEditWrapperStyled>
        <FormError>Loading connector config...</FormError>
      </ConnectEditWrapperStyled>
    );
  }

  if (isConfigError && !config) {
    return (
      <ConnectEditWrapperStyled>
        <FormError>
          Failed to load connector config. Please check connector status and try
          again.
        </FormError>
      </ConnectEditWrapperStyled>
    );
  }

  const prettyConfig = JSON.stringify(config || {}, null, '\t');
  const hasMaskedCredentials = prettyConfig.includes('"******"');

  return (
    <ConnectEditWrapperStyled>
      {hasMaskedCredentials && (
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
        <div>
          <ErrorMessage errors={errors} name="config" />
        </div>
        {submitError && <FormError>{submitError}</FormError>}
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
