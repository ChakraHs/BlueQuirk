package shop.bluequirk.blue_quirk_backend.identity.verification;

import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import shop.bluequirk.blue_quirk_backend.entity.User;
import shop.bluequirk.blue_quirk_backend.identity.config.IdentityProperties;
import shop.bluequirk.blue_quirk_backend.identity.email.IdentityEmailService;
import shop.bluequirk.blue_quirk_backend.identity.exception.IdentityExceptions;
import shop.bluequirk.blue_quirk_backend.identity.security.TokenGenerator;
import shop.bluequirk.blue_quirk_backend.identity.token.EmailVerificationToken;
import shop.bluequirk.blue_quirk_backend.identity.token.EmailVerificationTokenRepository;
import shop.bluequirk.blue_quirk_backend.repository.UserRepository;

@Service
public class EmailVerificationService {

    private final EmailVerificationTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final TokenGenerator tokenGenerator;
    private final IdentityEmailService emailService;
    private final IdentityProperties props;

    public EmailVerificationService(EmailVerificationTokenRepository tokenRepository, UserRepository userRepository,
                                    TokenGenerator tokenGenerator, IdentityEmailService emailService,
                                    IdentityProperties props) {
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
        this.tokenGenerator = tokenGenerator;
        this.emailService = emailService;
        this.props = props;
    }

    /** Issues a fresh single-use token (invalidating older ones) and emails the link. */
    @Transactional
    public void sendVerification(User user) {
        if (user.isEmailVerified()) {
            return;
        }
        tokenRepository.invalidateAllForUser(user);

        String raw = tokenGenerator.generateRawToken();
        EmailVerificationToken token = new EmailVerificationToken();
        token.setUser(user);
        token.setTokenHash(tokenGenerator.hash(raw));
        token.setExpiresAt(Instant.now().plus(props.getTokens().getVerificationTtl()));
        tokenRepository.save(token);

        emailService.sendVerificationEmail(user.getEmail(), user.getName(), raw);
    }

    @Transactional
    public void verify(String rawToken) {
        EmailVerificationToken token = tokenRepository.findByTokenHash(tokenGenerator.hash(rawToken))
                .orElseThrow(() -> new IdentityExceptions.InvalidToken("verification link"));
        if (!token.isValid()) {
            throw new IdentityExceptions.InvalidToken("verification link");
        }
        token.setUsed(true);
        tokenRepository.save(token);

        User user = token.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);
    }
}
