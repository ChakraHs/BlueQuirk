package shop.bluequirk.blue_quirk_backend.identity.token;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Revokes a refresh-token family in its <b>own</b> transaction. Reuse detection
 * happens on a request that then throws to reject the caller — which rolls back the
 * surrounding transaction. Committing the family revocation in a {@code REQUIRES_NEW}
 * transaction ensures the breach containment persists regardless of that rollback.
 */
@Service
public class RefreshTokenRevoker {

    private final RefreshTokenRepository repository;

    public RefreshTokenRevoker(RefreshTokenRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeFamily(String familyId) {
        repository.revokeFamily(familyId);
    }
}
