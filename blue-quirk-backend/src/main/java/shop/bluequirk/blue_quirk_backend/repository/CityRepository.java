package shop.bluequirk.blue_quirk_backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import shop.bluequirk.blue_quirk_backend.entity.City;

public interface CityRepository extends JpaRepository<City, Long> {

    /** All cities for the admin table, ordered for display. */
    List<City> findAllByOrderBySortOrderAscNameAsc();

    /** Active cities only — what the storefront checkout suggests. */
    List<City> findByActiveTrueOrderBySortOrderAscNameAsc();

    /** Case-insensitive lookup used to resolve a checkout city to its fees. */
    Optional<City> findFirstByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);
}
