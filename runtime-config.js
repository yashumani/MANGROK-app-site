/** Public runtime configuration. Never place service-role, payment, or private model credentials here. */
window.MANGROK_CONFIG = Object.freeze({
  appVersion: "3.6.0-alpha.7",
  supabaseUrl: "",
  supabaseAnonKey: "",
  printFunctionName: "print-order",
  legacyFunctionName: "legacy-review",
  alchemyFunctionName: "alchemy-ai",
  supportEmail: "",
  environment: "production",
  alchemyTrialLimit: 10,
  webllmModel: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
  aiGatewayUrl: "",
  aiGatewayModel: "",
  aiGatewayTimeoutMs: 65000,
  localAiTimeoutMs: 45000,
  ollamaBaseUrl: "",
  ollamaModel: "llama3.2"
});
import("./src/kitchen-ui.js").catch(error => console.warn("Kitchen library enhancement", error));
import("./src/alchemy-ui.js").catch(error => console.warn("Alchemy enhancement", error));
import("./src/atelier-reference-table.js").catch(error => console.warn("Recipe Atelier enhancement", error));
import("./src/readiness.js").catch(error => console.warn("Readiness enhancement", error));
import("./src/mobile-shell.js").catch(error => console.warn("Mobile shell enhancement", error));
import("./src/alchemy-cuisine-ui.js").catch(error => console.warn("Alchemy cuisine enhancement", error));
import("./src/agent-memory-ui.js").catch(error => console.warn("Agent memory enhancement", error));
import("./src/sticker-studio.js").catch(error => console.warn("Sticker Studio enhancement", error));
