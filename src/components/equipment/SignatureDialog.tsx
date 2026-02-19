import { useRef, useState, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasExistingSignature: boolean;
  onConfirm: (svgString?: string) => Promise<void>;
  equipmentName: string;
}

export function SignatureDialog({
  open, onOpenChange, hasExistingSignature, onConfirm, equipmentName,
}: SignatureDialogProps) {
  const { t } = useLanguage();
  const svgRef = useRef<SVGSVGElement>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const getPoint = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getPoint(e);
    setCurrentPath(`M ${x} ${y}`);
    setIsDrawing(true);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    const { x, y } = getPoint(e);
    setCurrentPath(p => `${p} L ${x} ${y}`);
  };

  const onPointerUp = () => {
    if (currentPath) setPaths(p => [...p, currentPath]);
    setCurrentPath('');
    setIsDrawing(false);
  };

  const clearCanvas = () => { setPaths([]); setCurrentPath(''); };

  const buildSvg = useCallback(() => {
    const svg = svgRef.current!;
    const { width, height } = svg.getBoundingClientRect();
    const pathEls = [...paths, currentPath]
      .filter(Boolean)
      .map(d => `<path d="${d}" stroke="black" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`)
      .join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${pathEls}</svg>`;
  }, [paths, currentPath]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      if (hasExistingSignature) {
        await onConfirm();
      } else {
        await onConfirm(buildSvg());
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const canConfirm = hasExistingSignature ? checked : paths.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('signature.title')}</DialogTitle>
          <DialogDescription>
            {t('signature.desc')} <strong>{equipmentName}</strong>
          </DialogDescription>
        </DialogHeader>

        {hasExistingSignature ? (
          <div className="flex items-center gap-3 py-4">
            <Checkbox
              id="sig-confirm"
              checked={checked}
              onCheckedChange={c => setChecked(!!c)}
            />
            <Label htmlFor="sig-confirm">{t('signature.confirmCheckbox')}</Label>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t('signature.drawPrompt')}</p>
            <div className="border rounded-lg overflow-hidden bg-white" style={{ touchAction: 'none' }}>
              <svg
                ref={svgRef}
                className="w-full"
                style={{ height: 180, cursor: 'crosshair' }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
              >
                {paths.map((d, i) => (
                  <path key={i} d={d} stroke="black" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ))}
                {currentPath && (
                  <path d={currentPath} stroke="black" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            </div>
            <Button variant="ghost" size="sm" onClick={clearCanvas} disabled={paths.length === 0}>
              {t('signature.clear')}
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleConfirm} disabled={!canConfirm || submitting}>
            {submitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {t('signature.saveAndAccept')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
