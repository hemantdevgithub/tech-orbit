import type { EventBus, EventEnvelope } from "@techorbit/event-bus";
import { UserRegisteredEventSchema, UserRoleAddedEventSchema } from "@techorbit/types";
import { candidateRepository } from "../repositories/candidate.repository.js";
import { interviewerService } from "../services/interviewer.service.js";

export async function registerUserEventConsumers(eventBus: EventBus): Promise<void> {
  await eventBus.subscribe("user.registered.v1", handleUserRegistered);
  await eventBus.subscribe("user.role_added.v1", handleUserRoleAdded);
}

async function handleUserRegistered(envelope: EventEnvelope): Promise<void> {
  const result = UserRegisteredEventSchema.safeParse(envelope);
  if (!result.success) return;

  const { userId, roleType } = result.data.payload;
  if (roleType) {
    await createShellForRole(userId, roleType);
  }
}

async function handleUserRoleAdded(envelope: EventEnvelope): Promise<void> {
  const result = UserRoleAddedEventSchema.safeParse(envelope);
  if (!result.success) return;

  const { userId, roleType } = result.data.payload;
  await createShellForRole(userId, roleType);
}

async function createShellForRole(userId: string, role: string): Promise<void> {
  if (role === "CANDIDATE") {
    await candidateRepository.createShell(userId).catch(() => { /* idempotent */ });
  }
  if (role === "INTERVIEWER") {
    await interviewerService.createShell(userId).catch(() => { /* idempotent */ });
  }
  // MSME and CUSTOMER shells require legalName so they are created
  // on first explicit profile creation call, not auto-provisioned here.
}
