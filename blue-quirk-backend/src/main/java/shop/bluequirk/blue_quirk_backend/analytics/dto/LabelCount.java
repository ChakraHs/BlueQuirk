package shop.bluequirk.blue_quirk_backend.analytics.dto;

import java.util.ArrayList;
import java.util.List;

/** Generic "group by label → count" row used for breakdown charts. */
public record LabelCount(String label, long count) {

    /**
     * Maps raw {@code [enumOrValue, count]} aggregation rows to labelled counts.
     * Enum labels use the enum name; everything else is stringified. Used for the
     * device/referrer breakdowns, which are queried as raw rows to avoid an
     * enum→string CAST in JPQL.
     */
    public static List<LabelCount> fromEnumRows(List<Object[]> rows) {
        List<LabelCount> out = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            String label = r[0] == null ? null
                    : (r[0] instanceof Enum<?> e ? e.name() : String.valueOf(r[0]));
            long count = r[1] instanceof Number n ? n.longValue() : 0L;
            out.add(new LabelCount(label, count));
        }
        return out;
    }
}
