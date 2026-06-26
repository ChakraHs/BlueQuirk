package shop.bluequirk.blue_quirk_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import shop.bluequirk.blue_quirk_backend.entity.StoreSettings;

@Repository
public interface StoreSettingsRepository extends JpaRepository<StoreSettings, Long> {
}
