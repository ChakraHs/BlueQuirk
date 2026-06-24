package shop.bluequirk.blue_quirk_backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import shop.bluequirk.blue_quirk_backend.entity.Product;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
	
	@Query("""
		    SELECT DISTINCT p
		    FROM Product p
		    LEFT JOIN FETCH p.selectedValues
		    LEFT JOIN FETCH p.images
		    LEFT JOIN FETCH p.translations
		""")
	Page<Product> findAllWithRelations(Pageable pageable);

	@Query("""
		    SELECT DISTINCT p
		    FROM Product p
		    LEFT JOIN FETCH p.selectedValues
		    LEFT JOIN FETCH p.images
		    LEFT JOIN FETCH p.translations
		    WHERE p.id = :id
		""")
	Optional<Product> findByIdWithRelations(@Param("id") Long id);
	
	
	@Query("""
		    SELECT DISTINCT p
		    FROM Product p
		    JOIN FETCH p.categories
		    LEFT JOIN FETCH p.images
		    LEFT JOIN FETCH p.selectedValues
		    LEFT JOIN FETCH p.translations
		    WHERE EXISTS (
		        SELECT c FROM p.categories c WHERE c.id = :categoryId
		    )
		""")
		List<Product> findByCategoryIdWithRelations(@Param("categoryId") Long categoryId);

	// --- Todify ---
	Optional<Product> findByTodifyTemplateId(String todifyTemplateId);

	boolean existsByTodifyTemplateId(String todifyTemplateId);

}
