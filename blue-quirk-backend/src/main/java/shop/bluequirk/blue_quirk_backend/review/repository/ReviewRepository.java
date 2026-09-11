package shop.bluequirk.blue_quirk_backend.review.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import shop.bluequirk.blue_quirk_backend.review.domain.ReviewStatus;
import shop.bluequirk.blue_quirk_backend.review.entity.Review;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    /**
     * Public product reviews — APPROVED only, featured first then newest. The
     * {@code status} filter is baked in so a caller can never accidentally page
     * pending/rejected reviews to the storefront.
     */
    Page<Review> findByProductIdAndStatusOrderByFeaturedDescCreatedAtDesc(
            Long productId, ReviewStatus status, Pageable pageable);

    /** Approved photo reviews for the "customer photos" strip (newest first). */
    Page<Review> findByProductIdAndStatusAndPhotoThumbnailUrlIsNotNullOrderByCreatedAtDesc(
            Long productId, ReviewStatus status, Pageable pageable);

    /**
     * One grouped aggregate row for a product+status: average, total and the per-star
     * counts. A single query (no N+1) that powers the compact rating summary.
     */
    @Query("""
           select coalesce(avg(r.rating), 0) as average,
                  count(r)                    as total,
                  coalesce(sum(case when r.rating = 5 then 1 else 0 end), 0) as five,
                  coalesce(sum(case when r.rating = 4 then 1 else 0 end), 0) as four,
                  coalesce(sum(case when r.rating = 3 then 1 else 0 end), 0) as three,
                  coalesce(sum(case when r.rating = 2 then 1 else 0 end), 0) as two,
                  coalesce(sum(case when r.rating = 1 then 1 else 0 end), 0) as one
           from Review r
           where r.productId = :productId and r.status = :status
           """)
    RatingAggregate aggregate(@Param("productId") Long productId, @Param("status") ReviewStatus status);

    /**
     * Admin moderation search with optional filters. Any of productId/status/q may be
     * null (ignored). {@code q} must already be lower-cased and wrapped in %…% by the
     * caller. Newest first.
     */
    @Query("""
           select r from Review r
           where (:productId is null or r.productId = :productId)
             and (:status is null or r.status = :status)
             and (:q is null or lower(r.body) like :q or lower(r.authorName) like :q
                  or (r.title is not null and lower(r.title) like :q))
           order by r.createdAt desc
           """)
    Page<Review> adminSearch(@Param("productId") Long productId,
                             @Param("status") ReviewStatus status,
                             @Param("q") String q,
                             Pageable pageable);

    /** Moderation-queue counts for the admin header. */
    long countByStatus(ReviewStatus status);

    /**
     * Batch average+count for several products at once (one grouped query, no N+1) —
     * powers the compact rating badge on product cards in listings. Only the given
     * status is counted; products with no matching reviews are simply absent.
     */
    @Query("""
           select r.productId as productId, avg(r.rating) as average, count(r) as total
           from Review r
           where r.productId in :ids and r.status = :status
           group by r.productId
           """)
    java.util.List<ProductRatingRow> aggregateForProducts(
            @Param("ids") java.util.Collection<Long> ids,
            @Param("status") ReviewStatus status);

    /** Projection for {@link #aggregateForProducts}. */
    interface ProductRatingRow {
        Long getProductId();
        double getAverage();
        long getTotal();
    }

    /** Projection for {@link #aggregate}. */
    interface RatingAggregate {
        double getAverage();
        long getTotal();
        long getFive();
        long getFour();
        long getThree();
        long getTwo();
        long getOne();
    }
}
