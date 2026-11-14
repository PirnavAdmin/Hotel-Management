import { createContext, useContext } from "react";

export const DialogContext = createContext(null);

export function useAppDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useAppDialog must be used within a DialogProvider");
  }
  return context;
}
