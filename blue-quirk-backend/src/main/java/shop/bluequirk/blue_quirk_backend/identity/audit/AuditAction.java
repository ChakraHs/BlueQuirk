package shop.bluequirk.blue_quirk_backend.identity.audit;

/** Security-relevant events recorded to the audit log. */
public enum AuditAction {
    REGISTER,
    LOGIN_SUCCESS,
    LOGIN_FAILURE,
    LOGOUT,
    TOKEN_REFRESH,
    REFRESH_REUSE_DETECTED,
    ACCOUNT_LOCKED,
    EMAIL_VERIFIED,
    PASSWORD_RESET_REQUESTED,
    PASSWORD_RESET_COMPLETED,
    PASSWORD_CHANGED,
    PROFILE_UPDATED,
    SESSION_REVOKED
}
