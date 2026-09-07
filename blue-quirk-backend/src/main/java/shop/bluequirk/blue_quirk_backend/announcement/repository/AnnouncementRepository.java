package shop.bluequirk.blue_quirk_backend.announcement.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import shop.bluequirk.blue_quirk_backend.announcement.entity.Announcement;

@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {

    /** All announcements for the admin list, in display order. */
    List<Announcement> findAllByOrderByPriorityAscIdAsc();

    /**
     * Announcements eligible to display right now: enabled AND inside their optional
     * schedule window. Ordered by the admin's priority. Eligibility is computed on
     * the server (never the client) so scheduling is authoritative (spec §10).
     */
    @Query("""
           select a from Announcement a
           where a.active = true
             and (a.startAt is null or a.startAt <= :now)
             and (a.endAt   is null or a.endAt   >= :now)
           order by a.priority asc, a.id asc
           """)
    List<Announcement> findEligible(@Param("now") LocalDateTime now);
}
