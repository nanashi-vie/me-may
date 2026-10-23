package vn.memay.auth;

public record CurrentAdmin(Long id, String email, AdminUser.Role role) {
    static CurrentAdmin from(AdminUser user) {
        return new CurrentAdmin(user.getId(), user.getEmail(), user.getRole());
    }
}
