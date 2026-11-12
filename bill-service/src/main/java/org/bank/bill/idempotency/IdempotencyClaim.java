package org.bank.bill.idempotency;

/**
 * Outcome of an idempotency claim.
 *
 * <ul>
 *   <li>{@code CLAIMED} — this caller owns the request, it must be executed;</li>
 *   <li>{@code REPLAY} — the request already completed, {@code responseBody}
 *       holds the exact response to return;</li>
 *   <li>{@code CONFLICT} — the key was reused with a different payload;</li>
 *   <li>{@code IN_PROGRESS} — another request with this key is running now.</li>
 * </ul>
 */
public record IdempotencyClaim(Outcome outcome, String responseBody) {

    public enum Outcome {
        CLAIMED,
        REPLAY,
        CONFLICT,
        IN_PROGRESS
    }

    public static IdempotencyClaim claimed() {
        return new IdempotencyClaim(Outcome.CLAIMED, null);
    }

    public static IdempotencyClaim replay(String responseBody) {
        return new IdempotencyClaim(Outcome.REPLAY, responseBody);
    }

    public static IdempotencyClaim conflict() {
        return new IdempotencyClaim(Outcome.CONFLICT, null);
    }

    public static IdempotencyClaim inProgress() {
        return new IdempotencyClaim(Outcome.IN_PROGRESS, null);
    }

    public boolean isClaimed() {
        return outcome == Outcome.CLAIMED;
    }
}
