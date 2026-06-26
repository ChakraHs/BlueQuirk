package shop.bluequirk.blue_quirk_backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shop.bluequirk.blue_quirk_backend.entity.Attribute;

@Repository
public interface AttributeRepository extends JpaRepository<Attribute, Long> {
	@Query("SELECT a FROM Attribute a LEFT JOIN FETCH a.values")
	List<Attribute> findAllWithValues();

	// Fetch the attribute with its values eagerly. Needed because open-in-view is
	// off: reading the lazy `values` collection (for serialization or to replace
	// it on update) outside a transaction would otherwise fail.
	@Query("SELECT a FROM Attribute a LEFT JOIN FETCH a.values WHERE a.id = :id")
	Optional<Attribute> findByIdWithValues(@Param("id") Long id);
}
