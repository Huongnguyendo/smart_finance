package com.smartwallet.auth.web;

import com.smartwallet.auth.service.AuthService;
import com.smartwallet.core.domain.User;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {
  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/register")
  public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
    User user = authService.register(
        request.getEmail(),
        request.getPassword(),
        request.getDisplayName());
    String token = authService.generateToken(user.getEmail());
    return new AuthResponse(token, UserResponse.from(user));
  }

  @PostMapping("/login")
  public AuthResponse login(@Valid @RequestBody LoginRequest request) {
    User user = authService.login(request.getEmail(), request.getPassword());
    String token = authService.generateToken(user.getEmail());
    return new AuthResponse(token, UserResponse.from(user));
  }

  @GetMapping("/me")
  public UserResponse me(@AuthenticationPrincipal User user) {
    if (user == null) {
      throw new org.springframework.security.access.AccessDeniedException("Not authenticated");
    }
    return UserResponse.from(user);
  }
}
