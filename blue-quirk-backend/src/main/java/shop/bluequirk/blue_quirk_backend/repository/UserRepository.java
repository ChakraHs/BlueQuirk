package shop.bluequirk.blue_quirk_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import shop.bluequirk.blue_quirk_backend.entity.User;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    /** Enabled users holding the "admin" role — the recipients of admin notifications. */
    @Query("select distinct u from User u join u.roles r where r.name = 'admin' and u.enabled = true")
    List<User> findEnabledAdmins();
}
