/** Public runtime configuration. Never place service-role, payment, or private model credentials here. */
window.MANGROK_CONFIG = Object.freeze({
  supabaseUrl: "",
  supabaseAnonKey: "",
  printFunctionName: "print-order",
  legacyFunctionName: "legacy-review",
  supportEmail: "",
  environment: "production",
  alchemyTrialLimit: 10,
  webllmModel: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
  aiGatewayUrl: "",
  aiGatewayModel: "",
  ollamaBaseUrl: "",
  ollamaModel: "llama3.2"
});
import("./src/kitchen-ui.js").catch(error=>console.warn("Kitchen library enhancement",error));
import("./src/alchemy-ui.js").catch(error=>console.warn("Alchemy enhancement",error));
import("./src/print-decor.js").catch(error=>console.warn("Print decoration enhancement",error));
