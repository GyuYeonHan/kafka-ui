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
import { useConnects, useCreateConnector } from 'lib/hooks/api/kafkaConnect';
import get from 'lodash/get';
import { Connect } from 'generated-sources';

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

  return 'Failed to create connector';
};

const New: React.FC = () => {
  const { clusterName } = useAppParams<ClusterNameRoute>();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    data: connects = [],
    isError: isConnectsError,
    isLoading: isConnectsLoading,
    isFetching: isConnectsFetching,
  } = useConnects(clusterName);
  const isConnectsPending =
    isConnectsLoading || (isConnectsFetching && connects.length === 0);
  const mutation = useCreateConnector(clusterName);

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

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    try {
      const connector = await mutation.createResource({
        connectName: values.connectName,
        newConnector: {
          name: values.name,
          config: JSON.parse(values.config.trim()),
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
    } catch (e) {
      setSubmitError(await getErrorMessage(e));
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
            render={({ field: { name, onChange, value } }) => (
              <Select
                selectSize="M"
                name={name}
                disabled={isSubmitting}
                onChange={onChange}
                value={value}
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
          <FormError>
            <ErrorMessage errors={errors} name="config" />
          </FormError>
        </div>
        {isConnectsError && (
          <FormError>
            Failed to load Kafka Connect clusters. Please check Connect status.
          </FormError>
        )}
        {isConnectsPending && (
          <FormError>Loading Kafka Connect clusters...</FormError>
        )}
        {!isConnectsPending && !isConnectsError && connects.length === 0 && (
          <FormError>
            No Kafka Connect clusters are configured for this cluster.
          </FormError>
        )}
        {submitError && <FormError>{submitError}</FormError>}
        <Button
          buttonSize="M"
          buttonType="primary"
          type="submit"
          disabled={
            !isValid ||
            isSubmitting ||
            !isDirty ||
            isConnectsPending ||
            isConnectsError ||
            connects.length === 0
          }
        >
          Submit
        </Button>
      </S.NewConnectFormStyled>
    </FormProvider>
  );
};

export default New;
