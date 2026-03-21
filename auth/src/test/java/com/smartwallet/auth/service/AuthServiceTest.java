package com.smartwallet.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.smartwallet.auth.UserRepository;
import com.smartwallet.auth.security.JwtService;
import com.smartwallet.core.domain.User;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

class AuthServiceTest {

  private JwtService createJwtService() {
    return new JwtService("test-secret-at-least-32-characters-long", 3600);
  }

  @Test
  void registerCreatesUserAndReturnsUser() {
    UserRepository userRepository = mock(UserRepository.class);
    PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    JwtService jwtService = createJwtService();
    when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
    when(passwordEncoder.encode(anyString())).thenReturn("hashed");
    when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

    AuthService authService = new AuthService(userRepository, passwordEncoder, jwtService);
    User user = authService.register("user@example.com", "password", "User");

    assertNotNull(user);
    assertEquals("user@example.com", user.getEmail());
    assertEquals("User", user.getDisplayName());
  }

  @Test
  void registerThrowsWhenEmailAlreadyExists() {
    UserRepository userRepository = mock(UserRepository.class);
    PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    JwtService jwtService = createJwtService();
    User existing = new User();
    existing.setEmail("user@example.com");
    when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(existing));

    AuthService authService = new AuthService(userRepository, passwordEncoder, jwtService);
    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> authService.register("user@example.com", "password", "User"));

    assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    assertEquals("Email already in use", ex.getReason());
  }

  @Test
  void loginReturnsUserForValidCredentials() {
    UserRepository userRepository = mock(UserRepository.class);
    PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    JwtService jwtService = createJwtService();
    User user = new User();
    user.setId(1L);
    user.setEmail("user@example.com");
    user.setPasswordHash("hashed");

    when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("password", "hashed")).thenReturn(true);

    AuthService authService = new AuthService(userRepository, passwordEncoder, jwtService);
    User loggedIn = authService.login("user@example.com", "password");

    assertNotNull(loggedIn);
    assertEquals(1L, loggedIn.getId());
    assertEquals("user@example.com", loggedIn.getEmail());
  }

  @Test
  void loginThrowsWhenUserNotFound() {
    UserRepository userRepository = mock(UserRepository.class);
    PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    JwtService jwtService = createJwtService();
    when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

    AuthService authService = new AuthService(userRepository, passwordEncoder, jwtService);
    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> authService.login("unknown@example.com", "password"));

    assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
    assertEquals("Invalid credentials", ex.getReason());
  }

  @Test
  void loginThrowsWhenPasswordWrong() {
    UserRepository userRepository = mock(UserRepository.class);
    PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    JwtService jwtService = createJwtService();
    User user = new User();
    user.setId(1L);
    user.setEmail("user@example.com");
    user.setPasswordHash("hashed");

    when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("wrong", "hashed")).thenReturn(false);

    AuthService authService = new AuthService(userRepository, passwordEncoder, jwtService);
    ResponseStatusException ex = assertThrows(ResponseStatusException.class,
        () -> authService.login("user@example.com", "wrong"));

    assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
    assertEquals("Invalid credentials", ex.getReason());
  }
}
