export type SafetyIntent =
  'education' | 'unsupported_clinical' | 'out_of_scope' | 'emergency';

export type SafetyDecision = {
  intent: SafetyIntent;
  action: 'allow' | 'refuse' | 'emergency';
  reply?: string;
  category: string;
};

/** How far before a keyword match we look for negation. */
const NEGATION_LOOKBACK = 56;

const NEGATION_RE =
  /\b(no|not|don'?t|doesn'?t|didn'?t|never|without|nor|neither|isn'?t|aren'?t|wasn'?t|weren'?t|haven'?t|hasn'?t|hadn'?t|won'?t|wouldn'?t|can'?t|cannot|ain'?t|no\s+longer|free\s+of|absence\s+of)\b/i;

/** Topic / encyclopedia framing (not a first-person crisis report). */
const EDUCATIONAL_FRAME_RE =
  /\b(what\s+(are|is|does|do|causes?)|symptoms?\s+of|signs?\s+of|tell\s+me\s+about|explain|define|definition\s+of|causes?\s+of|how\s+(does|do|is|are|can)|information\s+(on|about)|learn\s+about|difference\s+between|overview\s+of|meaning\s+of)\b/i;

/** User describing their own present situation. */
const FIRST_PERSON_RE = /\b(i(?:'m| am|'?ve| have)|im\b|my\b|me\b)\b/i;

const ACUTE_SELF_REPORT_RE =
  /\b(i(?:'m| am|'?ve| have)|im)\b.{0,48}\b(have|having|had|feel(?:ing)?|felt|got|getting|experienc(?:e|ing)|suffer(?:ing)?|woke\s+up\s+with)\b/i;

/** Clear suicidal / self-harm ideation (always escalate). */
const SELF_HARM_IDEATION: RegExp[] = [
  /\b(kill\s+(my|him|her)?self|end\s+(my|this)\s+life|take\s+my\s+(own\s+)?life)\b/i,
  /\b(want\s+to\s+die|suicidal(\s+thoughts?)?|commit\s+suicide|hurt\s+myself|self[-\s]?harm)\b/i,
  /\b(i\s+(?:am|'m|feel)\s+(?:so\s+)?(?:hopeless|worthless).{0,40}\b(die|suicide|end\s+it))\b/i,
];

/** Educational self-harm / suicide topics without ideation. */
const SELF_HARM_TOPIC_EDU_RE =
  /\b(suicide\s+prevention|what\s+is\s+suicide|signs?\s+of\s+suicid|suicid(?:e|al)\s+(?:hotline|helpline|resources?|statistics|rates?))\b/i;

type KeywordRule = {
  id: string;
  pattern: RegExp;
  /** If true, educational framing alone is not enough to suppress (e.g. "I'm choking"). */
  requireFirstPersonUnlessAcute?: boolean;
};

/**
 * Acute / emergency keywords. Matched only when not negated and not a pure
 * educational topic query (unless first-person acute self-report).
 */
const EMERGENCY_KEYWORDS: KeywordRule[] = [
  // Cardiac / respiratory
  { id: 'chest_pain', pattern: /\bchest\s+pain\b/i },
  { id: 'heart_attack', pattern: /\bheart\s+attack\b/i },
  {
    id: 'breathing',
    pattern:
      /\b((can'?t|cannot|hard\s+to|difficulty)\s+breathe|short(?:ness)?\s+of\s+breath|gasping\s+for\s+air)\b/i,
  },
  // Stroke
  {
    id: 'stroke',
    pattern:
      /\b(stroke|face\s+(?:is\s+)?droop(?:ing)?|arm\s+(?:is\s+)?weak(?:ness)?|slurred\s+speech|sudden\s+(?:numbness|weakness)\s+on\s+one\s+side)\b/i,
  },
  // Anaphylaxis / severe allergy
  {
    id: 'anaphylaxis',
    pattern:
      /\b(anaphyla\w*|throat\s+(?:is\s+)?(?:closing|swelling)|tongue\s+swelling|severe\s+allergic\s+reaction)\b/i,
  },
  // Bleeding / consciousness / overdose
  {
    id: 'severe_bleeding',
    pattern: /\b(severe\s+bleeding|bleeding\s+(?:won'?t|will\s+not)\s+stop)\b/i,
  },
  {
    id: 'unconscious',
    pattern:
      /\b(unconscious|unresponsive|not\s+breathing|passed\s+out\s+and\s+won'?t\s+wake)\b/i,
  },
  { id: 'overdose', pattern: /\b(overdose|took\s+too\s+many\s+pills)\b/i },
  { id: 'choking', pattern: /\b(choking|heimlich)\b/i },
  // Pregnancy emergencies
  {
    id: 'pregnancy_emergency',
    pattern:
      /\b((pregnant|pregnancy).{0,40}(heavy\s+bleeding|severe\s+(?:pain|headache)|seizure|vision\s+changes|water\s+broke)|ectopic|no\s+fetal\s+movement|reduced\s+fetal\s+movements?|preeclampsia)\b/i,
  },
  // Infant / child emergencies
  {
    id: 'pediatric_emergency',
    pattern:
      /\b((baby|infant|newborn|neonate).{0,40}(blue\s+lips|limp|not\s+feeding|won'?t\s+wake|seizure|fever)|fever\s+in\s+(?:a\s+)?(?:newborn|infant|baby\s+under\s+(?:3|three)\s+months))\b/i,
  },
  // Other urgent red flags
  {
    id: 'worst_headache',
    pattern:
      /\b(worst\s+headache\s+of\s+(my|his|her)\s+life|thunderclap\s+headache)\b/i,
  },
  {
    id: 'meningism',
    pattern:
      /\b(stiff\s+neck).{0,24}\b(fever|vomiting)\b|\b(fever).{0,24}\b(stiff\s+neck)\b/i,
  },
  {
    id: 'seizure_now',
    pattern: /\b(having\s+a\s+seizure|seizing\s+now|status\s+epilepticus)\b/i,
  },
];

/** Personal medication / clinical decision asks (refuse — not emergency). */
const MEDICATION_DECISION_RE: RegExp[] = [
  /\b(should|shall)\s+i\s+(take|start|stop|use|continue|skip|double|half)\b/i,
  /\b(can|could|may)\s+i\s+(take|stop|start|skip)\b/i,
  /\bis\s+it\s+safe\s+(for\s+me\s+)?to\s+(take|stop|start)\b/i,
  /\bhow\s+(much|many)\b.{0,40}\b(should\s+i\s+take|do\s+i\s+take)\b/i,
  /\b(start|stop|increase|decrease|change|adjust|taper)\b.{0,48}\b(dose|dosage|mg|mcg|medication|medicine|drug|pill|tablet|insulin)\b/i,
  /\b(my\s+)?(dose|dosage)\b.{0,32}\b(increase|decrease|change|too\s+high|too\s+low)\b/i,
  /\btaper\s+off\b/i,
  /\b(prescrib\w*|write\s+me\s+a\s+(script|prescription)|refill\s+my)\b/i,
  // Named-drug personal decision without "should I" (e.g. "I have diabetes. Take metformin?")
  /\b(take|taking|use|using)\s+(metformin|insulin|warfarin|aspirin|ibuprofen|paracetamol|acetaminophen|amoxicillin|antibiotics?|steroids?)\b.{0,20}\?/i,
  /\b(metformin|insulin|warfarin).{0,40}\b(should\s+i|can\s+i|for\s+me|my\s+diabetes)\b/i,
];

const DIAGNOSIS_ASK_RE: RegExp[] = [
  /\b(diagnos(?:e|is|ing)|what\s+do\s+i\s+have|do\s+i\s+have\s+[a-z])\b/i,
  /\bis\s+this\s+(cancer|diabetes|a\s+stroke|a\s+heart\s+attack)\b/i,
  /\bwhat(?:'s|\s+is)\s+wrong\s+with\s+me\b/i,
];

/** Ambiguous urgent self-reports that need clinician assessment, not DIY advice. */
const URGENT_ASSESSMENT_RE: RegExp[] = [
  /\b(i(?:'m| am|'ve| have)|im)\b.{0,40}\b(blood\s+in\s+(my\s+)?(stool|urine|vomit)|vomiting\s+blood|black\s+tarry\s+stools?)\b/i,
  /\b(i(?:'m| am)|im)\b.{0,40}\b(confused|disoriented|can'?t\s+wake|fainting\s+repeatedly)\b/i,
  /\b(sudden\s+(?:severe\s+)?(abdominal|stomach)\s+pain)\b/i,
];

const EMERGENCY_REPLY =
  'This may be an emergency. CareMate AI cannot provide emergency care. ' +
  'Please contact local emergency services now (in Nigeria dial 112 or go to the nearest emergency department), ' +
  'or reach a clinician immediately. If you are in immediate danger, seek help right away.';

const UNSUPPORTED_REPLY =
  'I can share general health education, but I cannot diagnose conditions, prescribe medicines, ' +
  'or advise you to start, stop, or change a dose. Please talk with a qualified clinician or pharmacist ' +
  'about your personal situation. If you have a general question about a health topic, feel free to ask.';

const URGENT_ASSESSMENT_REPLY =
  'Those symptoms can need urgent clinical assessment. CareMate AI cannot evaluate your personal case. ' +
  'Please contact a clinician promptly, or emergency services if symptoms are severe or worsening.';

const OUT_OF_SCOPE_REPLY =
  'I only help with general health education in CareMate — things like symptoms, conditions, ' +
  'prevention, nutrition, and wellness. I cannot help with math homework, finance, coding, ' +
  'or other non-health topics. If you have a health question, ask me that instead.';

/** Short greetings / capability checks — no model cost concern; allow a brief scoped reply. */
const GREETING_OR_META_RE =
  /^(hi|hello|hey|good\s+(morning|afternoon|evening)|thanks|thank\s+you|ok|okay|bye|what\s+can\s+you\s+do|who\s+are\s+you|help|how\s+does\s+this\s+work)[\s!.?]*$/i;

/**
 * Positive health / wellness signal. Used as an allowlist gate so generic
 * assistant tasks never reach the model.
 */
const HEALTH_SIGNAL_RE =
  /\b(?:health|healthy|healthcare|medical|medicin\w*|medication|symptom\w*|disease\w*|illness\w*|condition\w*|diagnos\w*|doctor|physician|clinician|nurse|clinic|hospital|pharmacy|pharmacist|pregnan\w*|prenatal|postnatal|breastfeed\w*|baby|infant|newborn|vaccine\w*|immuni\w*|allerg\w*|anaphyla\w*|infect\w*|fever|pain|ache|cough|headache|migraine|rash|itch\w*|dizz\w*|fatigue|sore|swell\w*|bleed\w*|bruise\w*|flu|cold|pneumonia|bronchit\w*|breath\w*|shortness\s+of\s+breath|blood|heart|cardiac|diabet\w*|hypertens\w*|asthma|cancer|tumor\w*|mental\s+health|anxiety|depress\w*|stress|suicid\w*|nutrition|nutrient\w*|diet\w*|calorie\w*|bmi|body\s+mass|exercise|fitness|workout|sleep|insomnia|hygiene|sanitation|first\s+aid|wound\w*|injur\w*|fracture\w*|stroke|seizure\w*|antibiotic\w*|insulin|metformin|covid|malaria|hiv|aids|tb|tuberculo\w*|anemi\w*|cholera|typhoid|sickle|genotype|blood\s+pressure|cholesterol|obesity|overweight|wellness|vitamin\w*|supplement\w*|oral\s+health|dental|tooth|teeth|eye\s+health|vision|hearing|menstrua\w*|period\s+pain|contracep\w*|std|sti|sexual\s+health|reproductive|kidney|liver|lung|respirat\w*|digest\w*|stomach|nausea|vomit\w*|diarrh\w*|constipat\w*|dehydrat\w*|heat\s+stroke|mosquito|caremate)\b/i;

/** Clear non-health assistant workloads — refuse even before the health-signal gate. */
const OUT_OF_SCOPE_PATTERNS: RegExp[] = [
  // Math / homework
  /\b(solve|calculate|compute|simplify)\b.{0,40}\b(equation|integral|derivative|algebra|polynomial|matrix)\b/i,
  /\b(what\s+is|what'?s)\s+\d+\s*[\+\-\*\/x×÷]\s*\d+/i,
  /\b\d+\s*[\+\-\*\/x×÷]\s*\d+\s*=/i,
  /\b(calculus|algebra|geometry|trigonometry|quadratic|factorial)\b/i,
  /\b(do|finish|write)\s+(my\s+)?(math|homework|assignment|essay|paper)\b/i,
  // Finance / business (non-health)
  /\b(stock|shares?|crypto|bitcoin|forex|portfolio|dividends?)\b/i,
  /\b(invest(?:ing|ment)?|trading|hedge\s+fund)\b/i,
  /\b(loan\s+interest|mortgage\s+payment|compound\s+interest|roi)\b/i,
  /\b(file\s+(my\s+)?taxes|tax\s+return|bookkeeping)\b/i,
  // Software / coding
  /\b(write|generate|debug|refactor)\b.{0,40}\b(code|script|function|class|sql|regex)\b/i,
  /\b(python|javascript|typescript|java|golang|rust|c\+\+|html|css)\b.{0,40}\b(code|function|program|script)\b/i,
  /\b(leetcode|unit\s+test|pull\s+request|github)\b/i,
  // Creative / entertainment
  /\b(write|compose)\s+(a\s+)?(poem|song|story|screenplay|joke|riddle)\b/i,
  /\b(movie|netflix|spotify|football\s+score|premier\s+league)\b/i,
  // Generic productivity
  /\b(summarize\s+this\s+(email|article|pdf)|translate\s+this\s+to)\b/i,
  /\b(plan\s+my\s+(vacation|wedding|itinerary))\b/i,
];

function normalize(content: string): string {
  return content.trim().replace(/\s+/g, ' ');
}

function isNegatedAt(text: string, matchIndex: number): boolean {
  const start = Math.max(0, matchIndex - NEGATION_LOOKBACK);
  const window = text.slice(start, matchIndex);
  return NEGATION_RE.test(window);
}

function firstMatchIndex(text: string, pattern: RegExp): number {
  const flags = pattern.flags.includes('g')
    ? pattern.flags
    : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  const match = re.exec(text);
  return match?.index ?? -1;
}

function isEducationalQuery(text: string): boolean {
  return EDUCATIONAL_FRAME_RE.test(text);
}

function isFirstPerson(text: string): boolean {
  return FIRST_PERSON_RE.test(text) || ACUTE_SELF_REPORT_RE.test(text);
}

function matchSelfHarmIdeation(text: string): boolean {
  if (SELF_HARM_TOPIC_EDU_RE.test(text) && !ACUTE_SELF_REPORT_RE.test(text)) {
    return false;
  }
  return SELF_HARM_IDEATION.some((pattern) => {
    const idx = firstMatchIndex(text, pattern);
    if (idx < 0) {
      return false;
    }
    // "I don't want to kill myself" — still sensitive; treat as allow only if clear negation of intent
    // and educational. Negated ideation → do not emergency-escalate on that match alone.
    return !isNegatedAt(text, idx);
  });
}

function matchEmergencyKeyword(text: string): { id: string } | null {
  const educational = isEducationalQuery(text);
  const firstPerson = isFirstPerson(text);
  const acuteSelf = ACUTE_SELF_REPORT_RE.test(text);

  for (const rule of EMERGENCY_KEYWORDS) {
    const idx = firstMatchIndex(text, rule.pattern);
    if (idx < 0) {
      continue;
    }
    if (isNegatedAt(text, idx)) {
      continue;
    }
    // Pure topic question ("What are the symptoms of a heart attack?") → education.
    if (
      educational &&
      !acuteSelf &&
      !/\bi\s+(?:have|am\s+having|think)\b/i.test(text)
    ) {
      continue;
    }
    // Keyword without first-person context and without acute phrasing → likely topic mention.
    if (!firstPerson && educational) {
      continue;
    }
    // "heart attack symptoms" style without educational helper verbs still often educational.
    if (
      !firstPerson &&
      !acuteSelf &&
      /\b(symptoms?|signs?|causes?|risk\s+factors?)\b/i.test(text)
    ) {
      continue;
    }
    return { id: rule.id };
  }
  return null;
}

function matchMedicationDecision(text: string): boolean {
  // Educational drug info: "What is metformin used for?"
  if (
    isEducationalQuery(text) &&
    !/\b(should|shall|can)\s+i\b/i.test(text) &&
    !/\bfor\s+me\b/i.test(text)
  ) {
    return false;
  }
  return MEDICATION_DECISION_RE.some((pattern) => pattern.test(text));
}

function matchDiagnosisAsk(text: string): boolean {
  if (
    isEducationalQuery(text) &&
    !/\b(do\s+i\s+have|wrong\s+with\s+me)\b/i.test(text)
  ) {
    // "What is a diagnosis of diabetes?" / "How is diabetes diagnosed?" → education
    if (
      /\bhow\s+is\b.{0,20}\bdiagnos/i.test(text) ||
      /\bdiagnos\w+\s+of\b/i.test(text)
    ) {
      return false;
    }
  }
  return DIAGNOSIS_ASK_RE.some((pattern) => pattern.test(text));
}

function matchUrgentAssessment(text: string): boolean {
  for (const pattern of URGENT_ASSESSMENT_RE) {
    const idx = firstMatchIndex(text, pattern);
    if (idx < 0) {
      continue;
    }
    if (isNegatedAt(text, idx)) {
      continue;
    }
    if (isEducationalQuery(text) && !ACUTE_SELF_REPORT_RE.test(text)) {
      continue;
    }
    return true;
  }
  return false;
}

function hasHealthSignal(text: string): boolean {
  return HEALTH_SIGNAL_RE.test(text);
}

function isGreetingOrMeta(text: string): boolean {
  return GREETING_OR_META_RE.test(text);
}

/**
 * Short conversational turns that only make sense with prior health context
 * (pronouns, comparisons, “which is best”, “tell me more”, etc.).
 */
function isShortHealthFollowUp(text: string): boolean {
  if (text.length > 160) {
    return false;
  }
  // Starts like a continuation / clarification.
  if (
    /^(what|why|how|when|which|who|and|also|so|then|but|ok|okay|yes|yeah|yep|right|sure|please)\b/i.test(
      text,
    )
  ) {
    return true;
  }
  // Comparative / ranking / elaboration that often omits the health noun.
  return /\b(which\s+(one|of\s+(?:these|those|them|the)|is|are|do\s+you)|what(?:'s|\s+is)\s+(?:the\s+)?(?:best|safest|most)|do you (?:think|recommend|suggest)|is that (?:true|safe|common|normal|better|effective)|are (?:those|these|they) (?:safe|effective|better|common)|tell me more|explain(?:\s+more)?|go on|continue|anything else|any others?|what about|how about|can you explain|the best(?:\s+one)?|safest)\b/i.test(
    text,
  );
}

function matchesHardOutOfScopeDomain(text: string): boolean {
  return /\b(stock|crypto|bitcoin|forex|python|javascript|typescript|leetcode|poem|movie|mortgage|netflix)\b/i.test(
    text,
  );
}

/**
 * Strict out-of-scope gate: clear non-health workloads, or any ask with no
 * health/wellness signal (except greetings and short follow-ups when prior
 * turns were health-related). Never calls the model for generic assistant work.
 */
function matchOutOfScope(
  text: string,
  context?: { priorTexts?: string[] },
): boolean {
  if (isGreetingOrMeta(text)) {
    return false;
  }

  const health = hasHealthSignal(text);
  const priorHealth = (context?.priorTexts ?? []).some((t) =>
    hasHealthSignal(t),
  );
  const denylisted = OUT_OF_SCOPE_PATTERNS.some((pattern) =>
    pattern.test(text),
  );

  if (denylisted) {
    if (!health || matchesHardOutOfScopeDomain(text)) {
      return true;
    }
    // Health + soft denylist verb (e.g. "calculate BMI") → in scope.
  }

  if (!health) {
    if (
      priorHealth &&
      isShortHealthFollowUp(text) &&
      !denylisted &&
      !matchesHardOutOfScopeDomain(text)
    ) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Multi-signal safety evaluation (deterministic).
 * Order: self-harm → emergency → urgent self-report → personal meds/diagnosis →
 * out-of-scope (no model call) → allow health education.
 */
export function classifyUserMessage(
  content: string,
  context?: { priorTexts?: string[] },
): SafetyDecision {
  const text = normalize(content);
  if (!text) {
    return {
      intent: 'education',
      action: 'allow',
      category: 'education',
    };
  }

  if (matchSelfHarmIdeation(text)) {
    return {
      intent: 'emergency',
      action: 'emergency',
      reply: EMERGENCY_REPLY,
      category: 'self_harm',
    };
  }

  const emergency = matchEmergencyKeyword(text);
  if (emergency) {
    return {
      intent: 'emergency',
      action: 'emergency',
      reply: EMERGENCY_REPLY,
      category: `emergency_${emergency.id}`,
    };
  }

  if (matchUrgentAssessment(text)) {
    return {
      intent: 'emergency',
      action: 'emergency',
      reply: URGENT_ASSESSMENT_REPLY,
      category: 'urgent_clinical_assessment',
    };
  }

  if (matchMedicationDecision(text)) {
    return {
      intent: 'unsupported_clinical',
      action: 'refuse',
      reply: UNSUPPORTED_REPLY,
      category: 'medication_decision',
    };
  }

  if (matchDiagnosisAsk(text)) {
    return {
      intent: 'unsupported_clinical',
      action: 'refuse',
      reply: UNSUPPORTED_REPLY,
      category: 'diagnosis_request',
    };
  }

  if (matchOutOfScope(text, context)) {
    return {
      intent: 'out_of_scope',
      action: 'refuse',
      reply: OUT_OF_SCOPE_REPLY,
      category: 'out_of_scope',
    };
  }

  return {
    intent: 'education',
    action: 'allow',
    category: 'education',
  };
}

export const SYSTEM_PROMPT = `You are CareMate AI, a general health education assistant inside the CareMate patient app.
You ONLY discuss general health, wellness, prevention, and related education topics.
You must refuse math homework, finance, investing, coding, entertainment, travel planning, and any non-health request in one short sentence and invite a health question instead.
Use the recent conversation turns as context: when the user asks a short follow-up (e.g. "which is best?", "tell me more", "is that safe?"), answer in continuity with the prior health topic — do not pretend you lack context.
You provide clear, accurate, accessible health information for education only.
You are NOT a doctor and do not provide personal medical advice, diagnosis, prescriptions, or dose changes.
If the user asks for personal clinical decisions, politely refuse and suggest seeing a clinician or pharmacist.
If symptoms sound urgent, tell them to seek emergency care immediately.
Prefer plain language. When unsure, say so. Do not invent citations in Phase 1.
Keep answers concise (a few short paragraphs unless the user asks for more detail).
Audience context: many users are in Nigeria or similar settings; avoid assuming high-resource care when giving practical tips.`;

/** Bump when safety rules / categories change (stored on ai_safety_event). */
export const POLICY_VERSION = 'caremate-ai-safety-v3';
