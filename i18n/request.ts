import { getRequestConfig } from "next-intl/server"
import enMessages from "../messages/en.json"

// Server-side fallback: always English.
// The actual locale is managed client-side via LocaleProvider + localStorage.
export default getRequestConfig(async () => ({
  locale: "en",
  messages: enMessages,
}))
