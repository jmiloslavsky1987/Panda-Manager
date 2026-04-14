'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeleteConfirmDialogProps {
  entityLabel: string;      // e.g., "this action", "this risk", "this milestone"
  onConfirm: () => Promise<void>;
  trigger: React.ReactNode; // the delete button/icon to wrap
  title?: string;           // override dialog title (default: "Delete {entityLabel}?")
  description?: string;     // override body text (default: "This action cannot be undone.")
  confirmLabel?: string;    // override confirm button label (default: "Delete")
}

export function DeleteConfirmDialog({ entityLabel, onConfirm, trigger, title, description, confirmLabel }: DeleteConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setOpen(false);
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title ?? `Delete ${entityLabel}?`}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description ?? 'This action cannot be undone.'}</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleting}>
            {deleting ? `${confirmLabel ?? 'Delete'}ing…` : (confirmLabel ?? 'Delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
