import Groq from 'groq-sdk';

// Lazy initialization — Groq client is created on first use,
// after dotenv.config() has run in server.js
let groq = null;
let groqInitialized = false;

const getGroq = () => {
  if (!groqInitialized) {
    groqInitialized = true;
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== '') {
      groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      console.log('Groq client initialized successfully');
    } else {
      console.log('GROQ_API_KEY not found, using rule-based scoring only');
    }
  }
  return groq;
};

export const calculateEligibilityScore = async (youthProfile, internshipRequirements, cvText = '') => {
  // No CV text extracted → candidate is ineligible
  if (!cvText || cvText.trim().length === 0) {
    return {
      total: 0,
      breakdown: { skillMatch: 0, educationMatch: 0, locationMatch: 0, priorityBoost: 0 },
      aiReasoning: 'No CV text could be extracted — score set to 0',
    };
  }

  let result;
  try {
    // Try AI scoring first
    result = await calculateAIScore(youthProfile, internshipRequirements, cvText);
  } catch (error) {
    console.error('AI scoring failed, falling back to CV-text keyword matching:', error.message);
    try {
      result = calculateCVTextScore(cvText, internshipRequirements);
    } catch (err2) {
      console.error('CV text scoring also failed, using profile-based fallback:', err2.message);
      result = calculateRuleBasedScore(youthProfile, internshipRequirements);
    }
  }

  // Override priorityBoost to be random 5-10 as requested
  // However, if all other match scores are 0, priorityBoost should also be 0
  let randomPriorityBoost = 0;
  if (
    result.breakdown.skillMatch === 0 &&
    result.breakdown.educationMatch === 0 &&
    result.breakdown.locationMatch === 0
  ) {
    randomPriorityBoost = 0;
  } else {
    randomPriorityBoost = Math.floor(Math.random() * 6) + 5;
  }
  
  result.breakdown.priorityBoost = randomPriorityBoost;
  
  // Recalculate total
  result.total = Math.min(
    result.breakdown.skillMatch + 
    result.breakdown.educationMatch + 
    result.breakdown.locationMatch + 
    randomPriorityBoost, 
    100
  );

  return result;
};

const calculateAIScore = async (youthProfile, internshipRequirements, cvText) => {
  const groqClient = getGroq();
  if (!groqClient) {
    console.log('Groq unavailable, falling back to CV-text keyword matching');
    return calculateCVTextScore(cvText, internshipRequirements);
  }

  const prompt = `
You are an expert HR recruiter analyzing a candidate's CV for an internship position.
The role might be in IT, Business, Architecture, or Arts.

CV TEXT (first 2000 chars):
${cvText.substring(0, 2000)}

INTERNSHIP REQUIREMENTS:
${JSON.stringify(internshipRequirements, null, 2)}

Score each category using these EXACT weight ranges and return ONLY a valid JSON object:

{
  "skillMatch": <0-40, based on relevant skill match (IT, Business, Architecture, Arts) with requirements>,
  "educationMatch": <0-20, based on education match (e.g., A/L, O/L, Diploma, Degree)>,
  "locationMatch": <0-10, based on location match (e.g., Colombo, Galle, Batticaloa, Kandy, Matara)>,
  "reasoning": "<one sentence explanation>"
}
`.trim();

  const completion = await groqClient.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
    max_tokens: 400,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error('Empty response from Groq');

  let scores;
  try {
    const cleaned = raw.replace(/\`\`\`(?:json)?/gi, '').trim();
    scores = JSON.parse(cleaned);
  } catch {
    console.error('Failed to parse Groq response:', raw);
    throw new Error('Invalid JSON from Groq');
  }

  const skillMatch = Math.max(0, Math.min(40, scores.skillMatch ?? 0));
  const educationMatch = Math.max(0, Math.min(20, scores.educationMatch ?? 0));
  const locationMatch = Math.max(0, Math.min(10, scores.locationMatch ?? 0));

  if (skillMatch < 5) {
    return {
      total: 0,
      breakdown: { skillMatch: 0, educationMatch: 0, locationMatch: 0, priorityBoost: 0 },
      aiReasoning: scores.reasoning ?? 'No relevant skills found — ineligible',
    };
  }

  return {
    total: skillMatch + educationMatch + locationMatch, // priorityBoost added later
    breakdown: { skillMatch, educationMatch, locationMatch, priorityBoost: 0 },
    aiReasoning: scores.reasoning ?? 'AI analysis complete',
  };
};

const calculateCVTextScore = (cvText, internshipRequirements) => {
  const textLower = cvText.toLowerCase();

  // 1. Skill Match (0-40)
  let skillMatch = 0;
  const requiredSkills = (internshipRequirements.skills ?? []).map(s => s.toLowerCase());

  if (requiredSkills.length === 0) {
    skillMatch = 40;
  } else {
    const matchedSkills = requiredSkills.filter(skill => {
      const aliases = SKILL_ALIASES[skill] || [skill];
      return aliases.some(alias => textLower.includes(alias));
    });

    const hasRelevantMatch = matchedSkills.some(s =>
      ALL_SKILLS.has(s) || [...ALL_SKILLS].some(t => s.includes(t) || t.includes(s))
    );

    if (matchedSkills.length === 0 || !hasRelevantMatch) {
      return {
        total: 0,
        breakdown: { skillMatch: 0, educationMatch: 0, locationMatch: 0, priorityBoost: 0 },
        aiReasoning: 'No relevant skills found in CV text',
      };
    }

    skillMatch = Math.round((matchedSkills.length / requiredSkills.length) * 40);
  }

  // 2. Education Match (0-20)
  let educationMatch = 0;
  const reqEduLevel = internshipRequirements.education?.level?.toLowerCase() || '';

  if (!reqEduLevel) {
    educationMatch = 20;
  } else {
    const foundEdu = EDUCATION_KEYWORDS.filter(kw => textLower.includes(kw));

    if (foundEdu.length > 0) {
      educationMatch += 10;
      if (reqEduLevel && textLower.includes(reqEduLevel)) {
        educationMatch += 10;
      }
    }
  }
  educationMatch = Math.min(educationMatch, 20);

  // 3. Location Match (0-10)
  let locationMatch = 0;
  const reqLocation = internshipRequirements.location;

  if (!reqLocation) {
    locationMatch = 10;
  } else {
    if (reqLocation.district && textLower.includes(reqLocation.district.toLowerCase())) {
      locationMatch += 10;
    } else {
      const locationTerms = ['colombo', 'galle', 'batticaloa', 'kandy', 'matara'];
      if (locationTerms.some(term => textLower.includes(term))) {
        locationMatch = 5;
      }
    }
  }

  return {
    total: skillMatch + educationMatch + locationMatch,
    breakdown: { skillMatch, educationMatch, locationMatch, priorityBoost: 0 },
    aiReasoning: `CV text matching — skills: ${skillMatch}`,
  };
};

const calculateRuleBasedScore = (youthProfile, internshipRequirements) => {
  let skillMatch = 0;
  if (!internshipRequirements.skills?.length) {
    skillMatch = 40;
  } else {
    const required = internshipRequirements.skills.map(s => s.toLowerCase());
    const candidate = (youthProfile.skills ?? []).map(s => s.toLowerCase());
    const matched = required.filter(req =>
      candidate.some(c => c.includes(req) || req.includes(c))
    );
    skillMatch = matched.length ? Math.round((matched.length / required.length) * 40) : 0;
  }

  let educationMatch = 10;
  let locationMatch = 10;

  return {
    total: skillMatch + educationMatch + locationMatch,
    breakdown: { skillMatch, educationMatch, locationMatch, priorityBoost: 0 },
    aiReasoning: 'Rule-based scoring (profile data only)',
  };
};

// --- CONSTANTS ---
const IT_SKILLS = ['javascript', 'python', 'java', 'c++', 'react', 'node.js', 'html', 'css', 'mongodb', 'sql', 'aws'];
const BUSINESS_SKILLS = ['marketing', 'sales', 'management', 'finance', 'accounting', 'seo', 'leadership', 'communication'];
const ARCHITECTURE_SKILLS = ['autocad', 'sketchup', 'revit', '3d modeling', 'drafting', 'design', 'planning'];
const ARTS_SKILLS = ['photoshop', 'illustrator', 'premiere pro', 'graphic design', 'painting', 'drawing', 'photography'];

const ALL_SKILLS = new Set([...IT_SKILLS, ...BUSINESS_SKILLS, ...ARCHITECTURE_SKILLS, ...ARTS_SKILLS]);

const SKILL_ALIASES = {
  // IT
  'javascript': ['js', 'ecmascript', 'javascript'],
  'react': ['reactjs', 'react.js', 'react'],
  'node.js': ['node', 'nodejs', 'node.js'],
  'python': ['py', 'python'],
  // Architecture
  'autocad': ['auto cad', 'autocad'],
  'revit': ['autodesk revit', 'revit'],
  // Arts
  'photoshop': ['adobe photoshop', 'photoshop', 'ps'],
  'illustrator': ['adobe illustrator', 'illustrator', 'ai'],
};

const EDUCATION_KEYWORDS = [
  'advance level', 'A/L', 'ordinary level', 'O/L', 'diploma', 'degree', 'bachelor', 'master', 'phd'
];