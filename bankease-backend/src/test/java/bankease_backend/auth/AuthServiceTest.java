package bankease_backend.auth;

import bankease_backend.model.User;
import bankease_backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthServiceTest {
    private UserRepository users;
    private AuthService authService;
    private User activeUser;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        authService = new AuthService(users);
        activeUser = mock(User.class);
        when(users.findByEmailIgnoreCase("person@example.com")).thenReturn(Optional.of(activeUser));
        when(activeUser.getStatus()).thenReturn("ACTIVE");
        when(activeUser.getPasswordHash()).thenReturn("demo-password");
        when(activeUser.getUserId()).thenReturn(7);
        when(activeUser.getFullName()).thenReturn("Demo Person");
        when(activeUser.getEmail()).thenReturn("person@example.com");
    }

    @Test
    void acceptsMatchingPasswordForActiveUserWithoutReturningPassword() {
        LoginResponse response = authService
                .login(new LoginRequest("person@example.com", "demo-password"))
                .orElseThrow();

        assertEquals(7, response.userId());
        assertEquals("Demo Person", response.fullName());
        assertEquals("person@example.com", response.email());
    }

    @Test
    void rejectsIncorrectPassword() {
        assertTrue(authService.login(new LoginRequest("person@example.com", "wrong"))
                .isEmpty());
    }

    @Test
    void rejectsInactiveUser() {
        when(activeUser.getStatus()).thenReturn("DISABLED");

        assertTrue(authService.login(new LoginRequest("person@example.com", "demo-password"))
                .isEmpty());
    }

}
