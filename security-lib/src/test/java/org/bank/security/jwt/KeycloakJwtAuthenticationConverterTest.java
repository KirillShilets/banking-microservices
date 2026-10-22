package org.bank.security.jwt;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class KeycloakJwtAuthenticationConverterTest {

    private static Jwt jwtWithRealmRoles(List<String> roles, boolean includeRealmAccess) {
        Jwt.Builder builder = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject("user-1");
        if (includeRealmAccess) {
            builder.claim("realm_access", Map.of("roles", roles));
        }
        return builder.build();
    }

    @Test
    void returnsOnlyRealmRolesWhenScopeConverterReturnsNull() {
        KeycloakJwtAuthenticationConverter converter =
                new KeycloakJwtAuthenticationConverter(jwt -> null);

        AbstractAuthenticationToken token = converter.convert(jwtWithRealmRoles(List.of("customer", "admin", "unknown"), true));

        assertThat(token.getAuthorities())
                .extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_customer", "ROLE_admin");
    }

    @Test
    void mergesScopeAuthoritiesAndRealmRoles() {
        KeycloakJwtAuthenticationConverter converter = new KeycloakJwtAuthenticationConverter(
                jwt -> List.of(new SimpleGrantedAuthority("SCOPE_profile")));

        AbstractAuthenticationToken token = converter.convert(jwtWithRealmRoles(List.of("customer"), true));

        assertThat(token.getAuthorities())
                .extracting(GrantedAuthority::getAuthority)
                .containsExactly("SCOPE_profile", "ROLE_customer");
    }

    @Test
    void returnsEmptyAuthoritiesWhenNoRealmAccess() {
        KeycloakJwtAuthenticationConverter converter =
                new KeycloakJwtAuthenticationConverter(jwt -> List.of());

        AbstractAuthenticationToken token = converter.convert(jwtWithRealmRoles(List.of(), false));

        assertThat(token.getAuthorities()).isEmpty();
        assertThat(token.getName()).isEqualTo("user-1");
    }

    @Test
    void defaultConstructorUsesScopeClaims() {
        KeycloakJwtAuthenticationConverter converter = new KeycloakJwtAuthenticationConverter();

        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject("user-1")
                .claim("scope", "openid profile")
                .claim("realm_access", Map.of("roles", List.of("customer")))
                .build();

        AbstractAuthenticationToken token = converter.convert(jwt);

        assertThat(token.getAuthorities())
                .extracting(GrantedAuthority::getAuthority)
                .contains("SCOPE_openid", "SCOPE_profile", "ROLE_customer");
    }

    @Test
    void ignoresNonStringRealmRoles() {
        KeycloakJwtAuthenticationConverter converter =
                new KeycloakJwtAuthenticationConverter(jwt -> null);

        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject("user-1")
                .claim("realm_access", Map.of("roles", List.of(1, 2)))
                .build();

        AbstractAuthenticationToken token = converter.convert(jwt);

        assertThat(token.getAuthorities()).isEmpty();
    }
}
