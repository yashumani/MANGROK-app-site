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
