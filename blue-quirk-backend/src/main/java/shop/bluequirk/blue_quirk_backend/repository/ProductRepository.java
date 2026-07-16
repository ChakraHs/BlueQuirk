package shop.bluequirk.blue_quirk_backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import shop.bluequirk.blue_quirk_backend.domain.ProductStatus;
import shop.bluequirk.blue_quirk_backend.entity.Product;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

	// status is optional: null returns every status (admin); a value filters to
	// it (e.g. PUBLISHED for the storefront). Ordered newest-first (creation date,
	// then id as a deterministic tie-break for rows predating created_at) so the
	// admin list and storefront default to the most recent products at the top.
	@Query("""
		    SELECT DISTINCT p
		    FROM Product p
		    LEFT JOIN FETCH p.selectedValues
		    LEFT JOIN FETCH p.images
		    LEFT JOIN FETCH p.translations
		    LEFT JOIN FETCH p.categories
		    WHERE (:status IS NULL OR p.status = :status)
		    ORDER BY p.createdAt DESC, p.id DESC
		""")
	Page<Product> findAllWithRelations(Pageable pageable, @Param("status") ProductStatus status);

	// Published products for a set of ids, with the relations needed to build a
	// ProductResponse. Feeds the Trending ranking (candidate set = products with
	// recent sales/views). Ordering is applied in-memory by the ranking algorithm.
	@Query("""
		    SELECT DISTINCT p
		    FROM Product p
		    LEFT JOIN FETCH p.selectedValues
		    LEFT JOIN FETCH p.images
		    LEFT JOIN FETCH p.translations
		    LEFT JOIN FETCH p.categories
		    WHERE p.id IN :ids AND p.status = :status
		""")
	List<Product> findByIdInWithRelations(@Param("ids") java.util.Collection<Long> ids,
			@Param("status") ProductStatus status);

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

	// Every product with its translations eagerly loaded. Feeds the admin catalog
	// content audit/backfill utility, which inspects each product's description
	// and its per-language translations to find and fill gaps.
	@Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.translations ORDER BY p.id")
	List<Product> findAllWithTranslations();

	// One-time backfill: give every product with no materials value the default.
	// Existing products predate the `material` column, so Hibernate leaves it NULL
	// until this runs. Returns the number of rows updated.
	@Modifying
	@Transactional
	@Query("UPDATE Product p SET p.material = :value WHERE p.material IS NULL OR p.material = ''")
	int backfillMissingMaterial(@Param("value") String value);

	// --- Todify ---
	Optional<Product> findByTodifyTemplateId(String todifyTemplateId);

	boolean existsByTodifyTemplateId(String todifyTemplateId);

}
