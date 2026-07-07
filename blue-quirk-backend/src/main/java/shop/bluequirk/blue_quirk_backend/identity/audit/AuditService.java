package shop.bluequirk.blue_quirk_backend.identity.audit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Records security events. Writes run in their own transaction so an audit failure
 * can never roll back the business action that triggered it, and a rolled-back
 * action still leaves its audit trail (e.g. a failed login attempt).
 */
@Service
public class AuditService {

    private static final Logger LOG = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository repository;

    public AuditService(AuditLogRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(AuditAction action, Long userId, String email, String detail,
                       String ip, String userAgent) {
        try {
            AuditLog log = AuditLog.of(action, userId, email);
            log.setDetail(detail);
            log.setIpAddress(ip);
            log.setUserAgent(userAgent);
            repository.save(log);
        } catch (Exception e) {
            // Never let auditing break the request.
            LOG.warn("Failed to write audit log for action={} email={}: {}", action, email, e.getMessage());
        }
    }
}
