package com.ev.pcs.keycloakauth.service;

public interface ProfileService {
    boolean activateUserAccount(String userId, String activationKey);
    boolean changePassword(String userId, String oldPassword, String newPassword);
}
