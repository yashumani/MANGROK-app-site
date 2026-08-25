import { AgentMemoryStore } from "./agent-memory.js";
import { IngredientSubmissionQueue } from "./ingredient-submissions.js";
import { createMangrokToolRegistry } from "./agent-tools.js";
import { routeAgentIntent, executeAgentPlan } from "./agent-router.js";
import { selectAgentSkills } from "./agent-skills.js";
import { buildMangrokAgentSystemPrompt } from "./agent-system.js";

let singleton = null;

export class MangrokAgentRuntime {
  constructor({ memory = new AgentMemoryStore(), submissions = new IngredientSubmissionQueue() } = {}) {
    this.memory = memory;
    this.submissions = submissions;
    this.registry = createMangrokToolRegistry({ memory, submissions });
  }

  async prepare({ query = "", input = {}, simulation = null, confirmedTools = new Set(), syncCloud = false } = {}) {
    const skills = selectAgentSkills({ query, input, simulation });
    const plan = routeAgentIntent({ query, input, simulation });
    const toolRuns = await executeAgentPlan(plan, this.registry, { simulation, confirmedTools, syncCloud, cloudMemory: syncCloud });
    const memoryRows = this.memory.recall(query || [...(input.ingredients || []), input.goal || ""].join(" "), { limit: 8 });
    const sessionRows = this.memory.searchSessions(query || input.goal || "", { limit: 4 });
    const context = Object.freeze({
      query: String(query || "").slice(0, 1600),
      intent: plan[0]?.reason || "deterministic culinary analysis",
      skills: Object.freeze(skills.map(skill => ({ id: skill.id, title: skill.title, instructions: skill.instructions }))),
      toolManifest: Object.freeze(this.registry.manifest()),
      toolRuns,
      memories: Object.freeze(memoryRows.map(row => ({ scope: row.scope, key: row.key, content: row.content, confidence: row.confidence }))),
      sessions: Object.freeze(sessionRows.map(row => ({ title: row.title, summary: row.summary, ingredients: row.ingredients }))),
      memoryEnabled: this.memory.isEnabled()
    });
    return Object.freeze({
      context,
      systemPrompt: buildMangrokAgentSystemPrompt({ skills, toolManifest: this.registry.manifest(), memories: context.memories, sessionSummaries: context.sessions }),
      trace: Object.freeze({
        intent: context.intent,
        skills: Object.freeze(skills.map(skill => skill.title)),
        tools: Object.freeze(toolRuns.map(run => ({ name: run.tool, status: run.ok ? "completed" : "failed", durationMs: run.durationMs }))),
        memoryEnabled: context.memoryEnabled,
        recalledMemories: context.memories.length,
        recalledSessions: context.sessions.length
      })
    });
  }

  saveSuccessfulSession({ result, input, trace } = {}) {
    if (!result || !this.memory.isEnabled()) return null;
    return this.memory.saveSession({
      title: result.title || "Alchemy session",
      summary: String(result.summary || "").slice(0, 700),
      ingredients: input?.ingredients || [],
      tools: trace?.tools?.map(value => value.name) || []
    });
  }
}

export function getMangrokAgentRuntime() {
  if (!singleton) singleton = new MangrokAgentRuntime();
  return singleton;
}
