package com.smartwallet.auth;

import com.smartwallet.core.domain.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {
  Optional<User> findByEmail(String email);

  /** Fresh role from DB (avoids stale Hibernate session when role was updated). */
  @Query(value = "SELECT role FROM users WHERE email = :email", nativeQuery = true)
  Optional<String> findRoleNameByEmail(@Param("email") String email);
}
