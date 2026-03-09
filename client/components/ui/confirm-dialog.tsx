import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    loading?: boolean;
    onConfirm: () => void;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    loading = false,
    onConfirm,
}: ConfirmDialogProps) {
    const iconColor =
        variant === 'danger'
            ? 'text-red-500'
            : variant === 'warning'
                ? 'text-amber-500'
                : 'text-blue-500';

    const confirmColor =
        variant === 'danger'
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : variant === 'warning'
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <div className="space-y-4">
                    <div className={`flex items-center gap-3 ${iconColor}`}>
                        <AlertCircle className="h-6 w-6 shrink-0" />
                        <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{title}</h3>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        {description}
                    </p>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            {cancelLabel}
                        </Button>
                        <Button
                            className={confirmColor}
                            onClick={onConfirm}
                            disabled={loading}
                        >
                            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {confirmLabel}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
