package shop.bluequirk.blue_quirk_backend.careguide.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import shop.bluequirk.blue_quirk_backend.careguide.entity.CareGuideTemplate;

@Repository
public interface CareGuideTemplateRepository extends JpaRepository<CareGuideTemplate, Long> {

    /** All templates with their translations eagerly loaded, newest first. */
    @Query("SELECT DISTINCT t FROM CareGuideTemplate t LEFT JOIN FETCH t.translations ORDER BY t.id DESC")
    List<CareGuideTemplate> findAllWithTranslations();

    /** One template with its translations eagerly loaded. */
    @Query("SELECT t FROM CareGuideTemplate t LEFT JOIN FETCH t.translations WHERE t.id = :id")
    Optional<CareGuideTemplate> findByIdWithTranslations(@Param("id") Long id);

    /**
     * How many products currently reference this template. Used to (a) show the
     * in-use count in the admin list and (b) block deletion while > 0 until the
     * products are reassigned.
     */
    @Query("SELECT COUNT(p) FROM Product p WHERE p.careGuideTemplate.id = :templateId")
    long countProductsUsing(@Param("templateId") Long templateId);
}
