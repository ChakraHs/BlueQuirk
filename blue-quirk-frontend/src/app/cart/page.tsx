import { redirect } from "next/navigation";
import { getDefaultLang } from "@/lib/i18n";

// Legacy non-localized route — send shoppers to the localized cart.
export default function CartRedirect() {
  redirect(`/${getDefaultLang()}/cart`);
}
