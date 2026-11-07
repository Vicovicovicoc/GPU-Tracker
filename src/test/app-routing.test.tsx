import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("expose la fiche d'une carte graphique sous /gpu/:gpuId", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/gpu/6f1c2a3e-0000-4000-8000-000000000001");

    expect(matches.at(-1)?.routeId).toBe("/_authenticated/gpu/$gpuId");
    expect(matches.at(-1)?.params).toEqual({ gpuId: "6f1c2a3e-0000-4000-8000-000000000001" });
  });
});
