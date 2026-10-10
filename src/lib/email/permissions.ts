import "server-only";

interface ComposerUser {
  isAdmin?: boolean;
  subscriptionPlan?: string | null;
}

/**
 * Who may use the candidate-message composer. Admins only for now; extending
 * to paying ProPlus users later means changing this one function, not every
 * route and component.
 */
export function canComposeMessages(user: ComposerUser | null | undefined): boolean {
  return user?.isAdmin === true;
}
