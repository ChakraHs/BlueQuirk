package com.ev.pcs.keycloakauth.dto;

import lombok.Data;

@Data
public class AccountActivationRequest {
    private String activationKey;
}
