import { useAssignmentRequests } from '@/hooks/useAssignmentRequests';

/**
 * Hook to get count of pending equipment transfers (incoming + outgoing)
 * Used for badge notifications on Equipment navigation and Transfers tab
 */
export function usePendingTransfersCount() {
  const { incomingTransfers, outgoingTransfers } = useAssignmentRequests();

  const incomingCount = incomingTransfers.length;
  const outgoingCount = outgoingTransfers.length;
  const totalCount = incomingCount + outgoingCount;

  return {
    incomingCount,
    outgoingCount,
    totalCount,
  };
}
