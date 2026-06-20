package shop.bluequirk.blue_quirk_backend.utility;

import java.util.Map;

public class TemplateEngine {

    public static String process(
            String template,
            Map<String, String> variables
    ) {

        String result = template;

        for (Map.Entry<String, String> entry : variables.entrySet()) {
            result = result.replace(
                    "{{" + entry.getKey() + "}}",
                    entry.getValue()
            );
        }

        return result;
    }
}
