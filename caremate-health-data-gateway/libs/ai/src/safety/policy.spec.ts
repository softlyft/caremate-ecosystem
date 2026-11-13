import { classifyUserMessage } from './policy';

describe('classifyUserMessage', () => {
  describe('allows general education', () => {
    it.each([
      'What is blood pressure?',
      'What are the symptoms of a heart attack?',
      "I don't have chest pain. What are the symptoms of a heart attack?",
      'Tell me about stroke risk factors',
      'What is metformin used for?',
      'How is diabetes diagnosed?',
      'Signs of anaphylaxis in general',
      'What is suicide prevention?',
      'Causes of shortness of breath',
      'Difference between type 1 and type 2 diabetes',
    ])('allows: %s', (message) => {
      const result = classifyUserMessage(message);
      expect(result.action).toBe('allow');
      expect(result.intent).toBe('education');
    });
  });

  describe('negation and context (false-positive guards)', () => {
    it('does not escalate negated chest pain in an education ask', () => {
      const result = classifyUserMessage(
        "I don't have chest pain. What are the symptoms of a heart attack?",
      );
      expect(result.action).toBe('allow');
    });

    it('does not escalate "never had a stroke" topic questions', () => {
      const result = classifyUserMessage(
        'I have never had a stroke. What are early signs of stroke?',
      );
      expect(result.action).toBe('allow');
    });

    it('does not escalate "without difficulty breathing" education', () => {
      const result = classifyUserMessage(
        'Can asthma exist without difficulty breathing?',
      );
      expect(result.action).toBe('allow');
    });
  });

  describe('emergency — cardiac / respiratory / stroke', () => {
    it.each([
      'I have severe chest pain and cannot breathe',
      "I'm having chest pain right now",
      'I think I am having a heart attack',
      "I can't breathe and my lips feel numb",
      'My face is drooping and my speech is slurred',
      'Sudden weakness on one side of my body',
    ])('emergency: %s', (message) => {
      expect(classifyUserMessage(message).action).toBe('emergency');
    });
  });

  describe('emergency — anaphylaxis / bleeding / overdose / choking', () => {
    it.each([
      'I think this is anaphylaxis after eating peanuts',
      'My throat is closing and I have hives',
      'Severe bleeding that will not stop',
      'Someone is unconscious and not breathing',
      'I took too many pills — overdose',
      'My child is choking on food',
    ])('emergency: %s', (message) => {
      expect(classifyUserMessage(message).action).toBe('emergency');
    });
  });

  describe('emergency — pregnancy and pediatric', () => {
    it.each([
      "I'm pregnant with heavy bleeding and severe pain",
      'Reduced fetal movements since yesterday',
      'Possible ectopic pregnancy with sharp pain',
      'My newborn has a fever and will not wake to feed',
      'Infant with blue lips and limp body',
    ])('emergency: %s', (message) => {
      expect(classifyUserMessage(message).action).toBe('emergency');
    });
  });

  describe('emergency — self-harm', () => {
    it.each([
      'I want to kill myself',
      'I have suicidal thoughts and a plan',
      'I am going to hurt myself tonight',
    ])('emergency: %s', (message) => {
      const result = classifyUserMessage(message);
      expect(result.action).toBe('emergency');
      expect(result.category).toBe('self_harm');
    });
  });

  describe('urgent clinical assessment', () => {
    it.each([
      "I'm vomiting blood",
      'I have blood in my stool and feel weak',
      'Sudden severe abdominal pain',
    ])('emergency: %s', (message) => {
      expect(classifyUserMessage(message).action).toBe('emergency');
    });
  });

  describe('refuses medication and diagnosis decisions', () => {
    it.each([
      'Should I increase my dose of metformin?',
      'I have diabetes. Should I take metformin?',
      'Can I stop my insulin this week?',
      'How much ibuprofen should I take for my pain?',
      'Is it safe for me to take warfarin with this?',
      'Please prescribe antibiotics for my cough',
      'What do I have based on these symptoms?',
      "What's wrong with me?",
      'Start me on a higher dosage of my medication',
    ])('refuse: %s', (message) => {
      const result = classifyUserMessage(message);
      expect(result.action).toBe('refuse');
      expect(result.intent).toBe('unsupported_clinical');
    });
  });

  describe('priority order', () => {
    it('escalates emergency before medication refusal', () => {
      const result = classifyUserMessage(
        'I have chest pain. Should I take aspirin?',
      );
      expect(result.action).toBe('emergency');
    });

    it('escalates self-harm before education framing nearby', () => {
      const result = classifyUserMessage(
        'What is depression? Also I want to end my life.',
      );
      expect(result.action).toBe('emergency');
      expect(result.category).toBe('self_harm');
    });
  });

  describe('out of scope — no model call for non-health', () => {
    it.each([
      'What is 15% of 200?',
      'Solve this quadratic equation for x',
      'Should I buy Bitcoin right now?',
      'Write a Python function to sort a list',
      'Write me a poem about the ocean',
      'Plan my vacation itinerary to Dubai',
      'What is the capital of France?',
      'Summarize this email for my boss',
    ])('refuse: %s', (message) => {
      const result = classifyUserMessage(message);
      expect(result.action).toBe('refuse');
      expect(result.intent).toBe('out_of_scope');
      expect(result.category).toBe('out_of_scope');
    });

    it('allows health-framed BMI calculation education', () => {
      const result = classifyUserMessage('How do I calculate BMI for adults?');
      expect(result.action).toBe('allow');
    });

    it('allows short follow-ups when prior turns were health-related', () => {
      const result = classifyUserMessage('What causes it?', {
        priorTexts: [
          'What is hypertension?',
          'Hypertension means high blood pressure.',
        ],
      });
      expect(result.action).toBe('allow');
    });

    it.each([
      'Which do you think is best?',
      'Which one is safest?',
      'What is the best option?',
      'Do you recommend any of those?',
      'Is that effective?',
      'Tell me more',
      'Anything else?',
    ])('allows comparative follow-up after health topic: %s', (message) => {
      const result = classifyUserMessage(message, {
        priorTexts: [
          'Can you give me methods to prevent pregnancy?',
          'Common contraceptive options include condoms, pills, IUDs, and implants.',
        ],
      });
      expect(result.action).toBe('allow');
    });

    it('refuses comparative follow-up with no prior health context', () => {
      const result = classifyUserMessage('Which do you think is best?');
      expect(result.action).toBe('refuse');
      expect(result.intent).toBe('out_of_scope');
    });

    it('refuses short follow-ups with no prior health context', () => {
      const result = classifyUserMessage('What causes it?');
      expect(result.action).toBe('refuse');
      expect(result.intent).toBe('out_of_scope');
    });

    it('allows greetings without calling them out of scope', () => {
      expect(classifyUserMessage('Hello').action).toBe('allow');
      expect(classifyUserMessage('What can you do?').action).toBe('allow');
    });

    it('refuses finance even if "health" is mentioned incidentally', () => {
      const result = classifyUserMessage(
        'Is Bitcoin a healthy investment for my portfolio?',
      );
      expect(result.action).toBe('refuse');
      expect(result.intent).toBe('out_of_scope');
    });
  });
});
