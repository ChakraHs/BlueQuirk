package shop.bluequirk.blue_quirk_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import shop.bluequirk.blue_quirk_backend.entity.TodifySettings;

public interface TodifySettingsRepository extends JpaRepository<TodifySettings, Long> {
}
