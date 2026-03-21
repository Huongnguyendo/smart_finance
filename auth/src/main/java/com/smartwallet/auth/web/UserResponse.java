package com.smartwallet.auth.web;

import com.smartwallet.core.domain.User;
import com.smartwallet.core.domain.UserRole;

public class UserResponse {
  private Long id;
  private String email;
  private String displayName;
  private UserRole role;

  public UserResponse(Long id, String email, String displayName, UserRole role) {
    this.id = id;
    this.email = email;
    this.displayName = displayName;
    this.role = role;
  }

  public static UserResponse from(User user) {
    return new UserResponse(
        user.getId(), user.getEmail(), user.getDisplayName(), user.getRole());
  }

  public Long getId() {
    return id;
  }

  public String getEmail() {
    return email;
  }

  public String getDisplayName() {
    return displayName;
  }

  public UserRole getRole() {
    return role;
  }
}
