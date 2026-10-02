import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
} from "@repo/ui";

interface FormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  submitDisabled?: boolean;
  maxWidth?: string;
}

export const FormDialog: React.FC<FormDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  onSubmit,
  submitLabel = "Save Changes",
  cancelLabel = "Cancel",
  loading = false,
  submitDisabled = false,
  maxWidth = "max-w-xl",
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loading && !submitDisabled && onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className={`${maxWidth} max-h-[90vh] overflow-y-auto`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </DialogHeader>

          <div className="py-2 space-y-4">{children}</div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="text-xs"
            >
              {cancelLabel}
            </Button>
            {onSubmit && (
              <Button
                type="submit"
                disabled={loading || submitDisabled}
                className="text-xs"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Processing...
                  </span>
                ) : (
                  submitLabel
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
export default FormDialog;
