package shop.bluequirk.blue_quirk_backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import shop.bluequirk.blue_quirk_backend.entity.Category;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
	@Query("SELECT DISTINCT c FROM Category c LEFT JOIN FETCH c.children LEFT JOIN FETCH c.translations")
	List<Category> findAllWithChildren();
	
	@Query("""
			SELECT DISTINCT c
		    FROM Category c
		    LEFT JOIN FETCH c.children
		    LEFT JOIN FETCH c.translations
		    WHERE c.id = :id
			""")
			Optional<Category> findByIdWithChildren(Long id);
	
	
	@Query("""
		    SELECT DISTINCT c
		    FROM Category c
		    LEFT JOIN FETCH c.children
		    LEFT JOIN FETCH c.translations
		""")
		List<Category> findAllWithChildrenByLanguage(@Param("lang") String lang);
}
