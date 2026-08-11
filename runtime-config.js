/**
 * Public runtime configuration. Never place a service-role key here.
 * The Supabase anonymous key is designed for browser use only when RLS is enabled.
 */
window.MANGROK_CONFIG = Object.freeze({
  supabaseUrl: "",
  supabaseAnonKey: "",
  printFunctionName: "print-order",
  legacyFunctionName: "legacy-review",
  supportEmail: "",
  environment: "production"
});

// Progressive enhancement for the food-first interface and visual kitchen library.
import("./src/kitchen-ui.js").catch(error => console.warn("Kitchen library enhancement", error));
