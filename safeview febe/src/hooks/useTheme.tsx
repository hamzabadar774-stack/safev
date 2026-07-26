import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="safeview-theme"
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}

export const useTheme = useNextTheme;
