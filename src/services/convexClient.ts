import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

export const isConvexConfigured = Boolean(convexUrl && convexUrl.startsWith("https://"));

export const convexClient = isConvexConfigured
  ? new ConvexReactClient(convexUrl as string)
  : null;
