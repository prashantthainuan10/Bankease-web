package bankease_backend.auth;

public record LoginResponse(Integer userId, String fullName, String email, boolean administrator) {
    public LoginResponse(Integer userId, String fullName, String email) {
        this(userId, fullName, email, false);
    }
}
