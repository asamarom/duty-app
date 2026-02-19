import { useAssignmentRequests } from './useAssignmentRequests';

export function usePendingRequestsCount() {
  const { incomingTransfers } = useAssignmentRequests();
  return incomingTransfers.length;
}
