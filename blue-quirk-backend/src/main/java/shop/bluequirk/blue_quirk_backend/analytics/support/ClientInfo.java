package shop.bluequirk.blue_quirk_backend.analytics.support;

import shop.bluequirk.blue_quirk_backend.analytics.domain.DeviceType;

/** Parsed User-Agent facts (device/browser/os) plus the bot verdict. */
public record ClientInfo(DeviceType deviceType, String browser, String os, boolean bot) {}
