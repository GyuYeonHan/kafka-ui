import styled from 'styled-components';

export const TagsWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  span {
    color: rgb(76, 76, 255) !important;
    &:hover {
      color: rgb(23, 23, 207) !important;
    }
  }
`;

export const ConnectFetchErrorsWrapper = styled.div`
  width: min(920px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 0.75rem 1rem;
  border: 1px solid ${({ theme }) => theme.metrics.indicator.warningTextColor};
  background-color: ${({ theme }) => theme.connectEditWarning};
  color: ${({ theme }) => theme.default.color.normal};
  border-radius: 8px;
`;

export const ConnectFetchErrorsTitle = styled.div`
  font-weight: 500;
  margin-bottom: 0.375rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

export const ConnectFetchErrorsDescription = styled.div`
  font-size: 0.875rem;
  line-height: 1.4;
`;

export const ConnectFetchErrorsList = styled.ul`
  margin: 0.375rem 0 0 1.25rem;
  padding: 0;
`;

export const ConnectListContent = styled.div`
  display: grid;
  gap: 0.875rem;
  padding-bottom: 0.5rem;
`;

export const ConnectMetricsBlock = styled.div`
  margin-top: 0.25rem;
`;
