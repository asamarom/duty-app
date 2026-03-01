import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ApprovalsManagement } from '@/components/approvals/ApprovalsManagement';
import { useLanguage } from '@/contexts/LanguageContext';

interface ApprovalsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApprovalsSheet({ isOpen, onClose }: ApprovalsSheetProps) {
  const { t } = useLanguage();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const content = (
    <div className="h-full overflow-y-auto">
      <ApprovalsManagement showHeader={false} className="p-0" />
    </div>
  );

  if (isDesktop) {
    // Desktop: Large modal (80% width, scrollable)
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[80vw] h-[85vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>{t('settings.approvals.title')}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {content}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Mobile: Full-screen sheet
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[100vh] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-6 pb-4 border-b">
          <SheetTitle>{t('settings.approvals.title')}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {content}
        </div>
      </SheetContent>
    </Sheet>
  );
}
