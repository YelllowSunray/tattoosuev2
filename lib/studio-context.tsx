"use client";

import { createContext, useContext, type ReactNode } from "react";
import { studioConfig, type StudioConfig } from "@/lib/studio-config";

const StudioContext = createContext<StudioConfig>(studioConfig);

export function StudioProvider({
  studio,
  children,
}: {
  studio: StudioConfig;
  children: ReactNode;
}) {
  return (
    <StudioContext.Provider value={studio}>{children}</StudioContext.Provider>
  );
}

export function useStudio(): StudioConfig {
  return useContext(StudioContext);
}
