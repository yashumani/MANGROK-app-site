export function buildMangrokAgentContext({ skills = [], toolManifest = [], toolResults = [], memories = [], sessionMatches = [] } = {}) {
  return Object.freeze({
    systemRules: [
      "Use deterministic Mangrok simulation as the primary factual anchor.",
      "Treat tool output as scoped evidence, not unrestricted truth.",
      "Never claim that a predicted cooking outcome is guaranteed.",
      "Never store sealed notes, passphrases, credentials, or full private recipes in memory.",
      "Only save a memory or submit an ingredient after explicit user confirmation.",
      "Label unresolved community submissions as unverified.",
      "Keep tool calls bounded and explain meaningful corrections."
    ],
    skills: skills.map(skill => ({ id: skill.id, description: skill.description })),
    tools: toolManifest,
    toolResults: toolResults.map(step => ({
      tool: step.tool,
      reason: step.reason,
      ok: Boolean(step.result?.ok),
      output: step.result?.ok ? step.result.output : undefined,
      error: step.result?.ok ? undefined : step.result?.error
    })),
    memories: memories.map(memory => ({
      scope: memory.scope,
      key: memory.key,
      content: memory.content,
      confidence: memory.confidence,
      updatedAt: memory.updatedAt
    })),
    sessionMatches: sessionMatches.map(session => ({
      id: session.id,
      title: session.title,
      updatedAt: session.updatedAt,
      messageCount: session.messageCount
    }))
  });
}
