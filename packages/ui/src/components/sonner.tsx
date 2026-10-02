"use client";

import * as React from "react";
import { Toaster as Sonner } from "sonner";

export { toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "font-sans rounded-lg border shadow-lg",
          description: "text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}
