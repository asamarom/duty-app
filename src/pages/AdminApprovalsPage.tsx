import { MainLayout } from '@/components/layout/MainLayout';
import { ApprovalsManagement } from '@/components/approvals/ApprovalsManagement';

export default function AdminApprovalsPage() {
  return (
    <MainLayout>
      <ApprovalsManagement showHeader={true} />
    </MainLayout>
  );
}
