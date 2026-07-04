package shop.bluequirk.blue_quirk_backend.analytics.dto;

import java.util.List;

/** Device / browser / OS / screen-resolution breakdowns. */
public record DevicesResponse(
        List<LabelCount> devices,
        List<LabelCount> browsers,
        List<LabelCount> os,
        List<LabelCount> screens
) {}
