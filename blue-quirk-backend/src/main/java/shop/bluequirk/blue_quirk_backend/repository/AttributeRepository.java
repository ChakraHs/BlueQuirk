package shop.bluequirk.blue_quirk_backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import shop.bluequirk.blue_quirk_backend.entity.Attribute;

@Repository
public interface AttributeRepository extends JpaRepository<Attribute, Long> {
	@Query("SELECT a FROM Attribute a LEFT JOIN FETCH a.values")
	List<Attribute> findAllWithValues();
}
