export class InsufficientCreditsError extends Error {
  public creditsRemaining: number;
  public cost: number;

  constructor(creditsRemaining: number, cost: number) {
    super(`Insufficient AI credits. You have ${creditsRemaining} but need ${cost}.`);
    this.name = "InsufficientCreditsError";
    this.creditsRemaining = creditsRemaining;
    this.cost = cost;
  }
}
