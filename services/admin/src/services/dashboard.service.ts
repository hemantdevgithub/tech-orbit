import { ForbiddenError } from "@techorbit/errors";
import type { AuthContext } from "@techorbit/auth-middleware";
import type { DashboardMetricsResponse } from "@techorbit/types";
import type { MetricsApi } from "../lib/metrics-api.js";
import type { RoleApplicationService } from "./role-application.service.js";
import type { DisputeService } from "./dispute.service.js";

function isAdmin(auth: AuthContext): boolean {
  return auth.roles.includes("ADMIN");
}

export type DashboardServiceDeps = {
  metricsApi: MetricsApi;
  roleApplicationService: RoleApplicationService;
  disputeService: DisputeService;
};

export type DashboardService = ReturnType<typeof createDashboardService>;

export function createDashboardService(deps: DashboardServiceDeps) {
  return {
    async metrics(auth: AuthContext): Promise<DashboardMetricsResponse> {
      if (!isAdmin(auth)) throw new ForbiddenError("Admin role required");

      const [pendingApplications, openDisputes, activeUsers, totalPlacements, gmvThisMonthUsd] =
        await Promise.all([
          deps.roleApplicationService.countPending(),
          deps.disputeService.countOpen(),
          deps.metricsApi.getActiveUsers(),
          deps.metricsApi.getTotalPlacements(),
          deps.metricsApi.getGmvThisMonthUsd(),
        ]);

      return {
        pendingApplications,
        openDisputes,
        activeUsers,
        totalPlacements,
        gmvThisMonthUsd,
      };
    },
  };
}
