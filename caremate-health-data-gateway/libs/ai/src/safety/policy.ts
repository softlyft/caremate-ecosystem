export type SafetyIntent = 'education' | 'unsupported_clinical' | 'emergency';

export type SafetyDecision = {
  intent: SafetyIntent;
  action: 'allow' | 'refuse' | 'emergency';
  reply?: string;
  category: string;
};

const EMERGENCY_PATTERNS: RegExp[] = [
  /\b(suicid|kill\s+myself|end\s+my\s+life|self[-\s]?harm)\b/i,
  /\b(chest\s+pain|heart\s+attack|can'?t\s+breathe|cannot\s+breathe|difficulty\s+breathing)\b/i,
  /\b(stroke|face\s+droop|slurred\s+speech)\b/i,
  /\b(severe\s+bleeding|unconscious|not\s+breathing|overdose)\b/i,
  /\b(choking|anaphyla)\b/i,
];

const UNSUPPORTED_PATTERNS: RegExp[] = [
  /\b(diagnos(e|is|ing)|what\s+do\s+i\s+have)\b/i,
  /\b(prescrib|write\s+me\s+a\s+(script|prescription))\b/i,
  /\b(start|stop|increase|decrease|change)\b.{0,40}\b(dose|dosage|mg|medication|medicine|drug|pill)\b/i,
  /\b(how\s+much\s+.+\s+should\s+i\s+take)\b/i,
  /\btaper\s+off\b/i,
];

const EMERGENCY_REPLY =
  'This may be an emergency. CareMate AI cannot provide emergency care. ' +
  'Please contact local emergency services now (in Nigeria dial 112 or go to the nearest emergency department), ' +
  'or reach a clinician immediately. If you are in immediate danger, seek help right away.';

const UNSUPPORTED_REPLY =
  'I can share general health education, but I cannot diagnose conditions, prescribe medicines, ' +
  'or advise you to start, stop, or change a dose. Please talk with a qualified clinician or pharmacist ' +
  'about your personal situation. If you have a general question about a health topic, feel free to ask.';

/** Deterministic pre-model safety classification (SoT: do not rely only on a second LLM). */
export function classifyUserMessage(content: string): SafetyDecision {
  const text = content.trim();
  for (const pattern of EMERGENCY_PATTERNS) {
    if (pattern.test(text)) {
      return {
        intent: 'emergency',
        action: 'emergency',
        reply: EMERGENCY_REPLY,
        category: 'emergency_signal',
      };
    }
  }
  for (const pattern of UNSUPPORTED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        intent: 'unsupported_clinical',
        action: 'refuse',
        reply: UNSUPPORTED_REPLY,
        category: 'unsupported_clinical',
      };
    }
  }
  return {
    intent: 'education',
    action: 'allow',
    category: 'education',
  };
}

export const SYSTEM_PROMPT = `You are CareMate AI, a general health education assistant inside the CareMate patient app.
You provide clear, accurate, accessible health information for education only.
You are NOT a doctor and do not provide personal medical advice, diagnosis, prescriptions, or dose changes.
If the user asks for personal clinical decisions, politely refuse and suggest seeing a clinician or pharmacist.
If symptoms sound urgent, tell them to seek emergency care immediately.
Prefer plain language. When unsure, say so. Do not invent citations in Phase 1.
Keep answers concise (a few short paragraphs unless the user asks for more detail).
Audience context: many users are in Nigeria or similar settings; avoid assuming high-resource care when giving practical tips.`;

export const POLICY_VERSION = 'caremate-ai-safety-v1';
