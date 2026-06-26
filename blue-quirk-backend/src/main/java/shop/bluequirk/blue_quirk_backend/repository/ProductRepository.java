package shop.bluequirk.blue_quirk_backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import shop.bluequirk.blue_quirk_backend.domain.ProductStatus;
import shop.bluequirk.blue_quirk_backend.entity.Product;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

	// status is optional: null returns every status (admin); a value filters to
	// it (e.g. PUBLISHED for the storefront).
	@Query("""
		    SELECT DISTINCT p
		    FROM Product p
		    LEFT JOIN FETCH p.selectedValues
		    LEFT JOIN FETCH p.images
		    LEFT JOIN FETCH p.translations
		    LEFT JOIN FETCH p.categories
		    WHERE (:status IS NULL OR p.status = :status)
		""")
	Page<Product> findAllWithRelations(Pageable pageable, @Param("status") ProductStatus status);

	@Query("""
		    SELECT DISTINCT p
		    FROM Product p
		    LEFT JOIN FETCH p.selectedValues
		    LEFT JOIN FETCH p.images
		    LEFT JOIN FETCH p.translations
		    LEFT JOIN FETCH p.categories
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
		    AND (:status IS NULL OR p.status = :status)
		""")
		List<Product> findByCategoryIdWithRelations(@Param("categoryId") Long categoryId,
				@Param("status") ProductStatus status);

	// --- Todify ---
	Optional<Product> findByTodifyTemplateId(String todifyTemplateId);

	boolean existsByTodifyTemplateId(String todifyTemplateId);

}
