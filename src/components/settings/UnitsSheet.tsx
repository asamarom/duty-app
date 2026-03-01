import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UnitsManagement } from '@/components/units/UnitsManagement';
import { useLanguage } from '@/contexts/LanguageContext';

interface UnitsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UnitsSheet({ isOpen, onClose }: UnitsSheetProps) {
  const { t } = useLanguage();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const content = (
    <div className="h-full overflow-y-auto">
      <UnitsManagement showHeader={false} showAddButton={true} className="p-0" />
    </div>
  );

  if (isDesktop) {
    // Desktop: Large modal (80% width, scrollable)
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[80vw] h-[85vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>{t('settings.units.title')}</DialogTitle>
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
          <SheetTitle>{t('settings.units.title')}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {content}
        </div>
      </SheetContent>
    </Sheet>
  );
}
