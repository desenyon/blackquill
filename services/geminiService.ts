

import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResponse, EssayInputs } from './types';
import { MOCK_RESPONSE } from './mock-data';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. Using mock data.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const fullResponseSchema = {
    type: Type.OBJECT,
    properties: {
        meta: {
            type: Type.OBJECT,
            properties: {
                reading_time_minutes: { type: Type.NUMBER },
                estimated_grade_band: { type: Type.STRING, enum: ["A", "B", "C", "Unclear"] },
                confidence: { type: Type.NUMBER },
                ultra_mode_used: { type: Type.BOOLEAN },
            },
            required: ["reading_time_minutes", "estimated_grade_band", "confidence", "ultra_mode_used"],
        },
        scores: {
            type: Type.OBJECT,
            properties: {
                thesis: { type: Type.INTEGER },
                argumentation: { type: Type.INTEGER },
                evidence: { type: Type.INTEGER },
                organization: { type: Type.INTEGER },
                style_and_voice: { type: Type.INTEGER },
                mechanics: { type: Type.INTEGER },
                citation_integrity: { type: Type.INTEGER },
                originality_risk: { type: Type.INTEGER },
            },
            required: ["thesis", "argumentation", "evidence", "organization", "style_and_voice", "mechanics", "citation_integrity", "originality_risk"],
        },
        macro_feedback: {
            type: Type.OBJECT,
            properties: {
                thesis_quality: {
                    type: Type.OBJECT,
                    properties: { diagnosis: { type: Type.STRING }, why_it_matters: { type: Type.STRING }, fix: { type: Type.STRING }, exemplar_rewrite: { type: Type.STRING } },
                    required: ["diagnosis", "why_it_matters", "fix", "exemplar_rewrite"],
                },
                argument_structure: {
                    type: Type.OBJECT,
                    properties: { diagnosis: { type: Type.STRING }, outline_current: { type: Type.ARRAY, items: { type: Type.STRING } }, outline_improved: { type: Type.ARRAY, items: { type: Type.STRING } } },
                    required: ["diagnosis", "outline_current", "outline_improved"],
                },
                thematic_depth: {
                    type: Type.OBJECT,
                    properties: { diagnosis: { type: Type.STRING }, missed_angles: { type: Type.ARRAY, items: { type: Type.STRING } }, how_to_deepen: { type: Type.ARRAY, items: { type: Type.STRING } } },
                    required: ["diagnosis", "missed_angles", "how_to_deepen"],
                },
                evidence_use: {
                    type: Type.OBJECT,
                    properties: { gaps: { type: Type.ARRAY, items: { type: Type.STRING } }, irrelevancies: { type: Type.ARRAY, items: { type: Type.STRING } }, integration_tips: { type: Type.ARRAY, items: { type: Type.STRING } }, signal_phrases_examples: { type: Type.ARRAY, items: { type: Type.STRING } } },
                    required: ["gaps", "irrelevancies", "integration_tips", "signal_phrases_examples"],
                },
                counterargument: {
                    type: Type.OBJECT,
                    properties: { missing_or_weak: { type: Type.STRING }, stronger_counterclaims: { type: Type.ARRAY, items: { type: Type.STRING } }, rebuttals: { type: Type.ARRAY, items: { type: Type.STRING } } },
                    required: ["missing_or_weak", "stronger_counterclaims", "rebuttals"],
                },
                rubric_alignment: {
                    type: Type.OBJECT,
                    properties: { likely_pitfalls: { type: Type.ARRAY, items: { type: Type.STRING } }, targeted_moves_to_score_max: { type: Type.ARRAY, items: { type: Type.STRING } } },
                    required: ["likely_pitfalls", "targeted_moves_to_score_max"],
                },
            },
            required: ["thesis_quality", "argument_structure", "thematic_depth", "evidence_use", "counterargument", "rubric_alignment"],
        },
        meso_feedback: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    paragraph_index: { type: Type.INTEGER },
                    topic_sentence_check: {
                        type: Type.OBJECT,
                        properties: { status: { type: Type.STRING, enum: ["clear", "vague", "missing"] }, rewrite: { type: Type.STRING } },
                        required: ["status", "rewrite"],
                    },
                    logic_flow: {
                        type: Type.OBJECT,
                        properties: { issues: { type: Type.ARRAY, items: { type: Type.STRING } }, bridges: { type: Type.ARRAY, items: { type: Type.STRING } } },
                        required: ["issues", "bridges"],
                    },
                    evidence_binding: {
                        type: Type.OBJECT,
                        properties: { quotes_or_data_needed: { type: Type.ARRAY, items: { type: Type.STRING } }, analysis_depth_tip: { type: Type.STRING } },
                        required: ["quotes_or_data_needed", "analysis_depth_tip"],
                    },
                    cohesion_score: { type: Type.INTEGER },
                },
                required: ["paragraph_index", "topic_sentence_check", "logic_flow", "evidence_binding", "cohesion_score"],
            },
        },
        micro_feedback: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    sentence_index: { type: Type.INTEGER },
                    original: { type: Type.STRING },
                    issues: { type: Type.ARRAY, items: { type: Type.STRING, enum: ["wordiness", "passive_voice", "ambiguous_pronoun", "comma_splice", "unsupported_claim", "tone_mismatch", "citation_missing", "tense_shift"] } },
                    rewrite_stronger: { type: Type.STRING },
                    why_rewrite_is_better: { type: Type.STRING },
                },
                required: ["sentence_index", "original", "issues", "rewrite_stronger", "why_rewrite_is_better"],
            },
        },
        style_tuning: {
            type: Type.OBJECT,
            properties: {
                target_style: { type: Type.STRING },
                diction_suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                syntax_variation_tips: { type: Type.ARRAY, items: { type: Type.STRING } },
                tone_consistency_notes: { type: Type.ARRAY, items: { type: Type.STRING } },
                cadence_examples: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["target_style", "diction_suggestions", "syntax_variation_tips", "tone_consistency_notes", "cadence_examples"],
        },
        citation_review: {
            type: Type.OBJECT,
            properties: {
                declared_style: { type: Type.STRING, enum: ["MLA", "APA", "Chicago", "Unknown"] },
                formatting_issues: { type: Type.ARRAY, items: { type: Type.STRING } },
                missing_attributions: { type: Type.ARRAY, items: { type: Type.STRING } },
                works_cited_gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
                examples_correct_format: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["declared_style", "formatting_issues", "missing_attributions", "works_cited_gaps", "examples_correct_format"],
        },
        originality_and_claims: {
            type: Type.OBJECT,
            properties: {
                unsupported_claims: { type: Type.ARRAY, items: { type: Type.STRING } },
                checkable_facts: { type: Type.ARRAY, items: { type: Type.STRING } },
                speculative_language_to_hedge: { type: Type.ARRAY, items: { type: Type.STRING } },
                originality_risk_rationale: { type: Type.STRING },
            },
            required: ["unsupported_claims", "checkable_facts", "speculative_language_to_hedge", "originality_risk_rationale"],
        },
        prioritized_action_plan: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    priority: { type: Type.STRING, enum: ["P0", "P1", "P2"] },
                    title: { type: Type.STRING },
                    why: { type: Type.STRING },
                    how: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["priority", "title", "why", "how"],
            },
        },
        one_pass_polish: {
            type: Type.OBJECT,
            properties: {
                global_rewrite_suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                transitions_pack: { type: Type.ARRAY, items: { type: Type.STRING } },
                thesis_plus_map_rewrite: { type: Type.STRING },
                elevated_conclusion_rewrite: { type: Type.STRING },
            },
            required: ["global_rewrite_suggestions", "transitions_pack", "thesis_plus_map_rewrite", "elevated_conclusion_rewrite"],
        },
        ultra_extras: {
            type: Type.OBJECT,
            properties: {
                assumption_stress_tests: { type: Type.ARRAY, items: { type: Type.STRING } },
                alternatives_to_thesis: { type: Type.ARRAY, items: { type: Type.STRING } },
                high_impact_additions: { type: Type.ARRAY, items: { type: Type.STRING } },
                examiner_trap_questions: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["assumption_stress_tests", "alternatives_to_thesis", "high_impact_additions", "examiner_trap_questions"],
        },
    },
    required: [
        "meta", "scores", "macro_feedback", "meso_feedback", "micro_feedback", 
        "style_tuning", "citation_review", "originality_and_claims", 
        "prioritized_action_plan", "one_pass_polish"
    ],
};


const SYSTEM_INSTRUCTION = `You are BlackQuill, a rigorous and world-class essay editor. Your primary directive is to provide the most comprehensive, insightful, and actionable feedback possible to elevate a student's essay.
You must adhere to the requested mode (standard or ultra) and evaluate the essay based on all provided inputs (essay_text, prompt, rubric, style_target, constraints).
Your analysis must be exceptionally thorough. Prioritize depth and quality above all else. When you provide rewrites, they must be significant improvements, not just minor edits. They should be of similar or greater length and demonstrate a clear enhancement in argumentation, clarity, and style. Be specific, never vague.
You MUST return your analysis in the specified JSON format, using the provided schema. Fill every field; if a field is not applicable, provide a brief explanation within the string or an empty array.
If Ultra Mode is enabled, you must add deep adversarial counter-analysis, multiple alternative thesis framings, a fallacy scan, and suggest scholarly upgrades.
Do not invent sources; use placeholders like "[CITATION NEEDED: ...]".
Your entire output must be a single, complete JSON object conforming to the schema.`;


export const getEssayCritique = async (inputs: EssayInputs): Promise<AnalysisResponse> => {
    if (!API_KEY) {
        console.log("Using mock data for critique.");
        return new Promise(resolve => setTimeout(() => resolve(MOCK_RESPONSE as AnalysisResponse), 1500));
    }

    const prompt = `
    Analyze the following essay based on the provided details.
    
    Mode: ${inputs.ultra ? 'Ultra' : 'Standard'}
    
    Essay Text:
    ---
    ${inputs.essay_text}
    ---
    
    Assignment Prompt: ${inputs.prompt || 'Not provided.'}
    Rubric: ${inputs.rubric || 'Not provided.'}
    Style Target: ${inputs.style_target || 'Not provided.'}
    Constraints: ${inputs.constraints || 'Not provided.'}
    
    Please provide your analysis in the required JSON format.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: fullResponseSchema,
            },
        });

        const jsonText = response.text.trim();
        const parsedResponse = JSON.parse(jsonText);

        // The ultra_extras field is optional in the schema for standard mode,
        // so we must ensure it's present if ultra mode was used.
        if (inputs.ultra && !parsedResponse.ultra_extras) {
            parsedResponse.ultra_extras = {
                assumption_stress_tests: ["Ultra mode analysis requested, but this section was not generated by the model."],
                alternatives_to_thesis: [],
                high_impact_additions: [],
                examiner_trap_questions: [],
            };
        }
        
        return parsedResponse as AnalysisResponse;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to get critique from the AI model. The model may have returned an invalid response.");
    }
};

export const sampleEssays = [
    {
        title: "Industrial Revolution (B-Grade)",
        text: `The industrial revolution was a pivotal moment in history. It changed society in many ways. For many people, life became very different. Factories were built, and cities grew larger as people moved to find work. This had both good and bad effects.
One of the main effects was economic. New technologies allowed for mass production, which made goods cheaper. This created wealth for some, but it also led to poor working conditions for many others. People worked long hours in dangerous factories. This is something that is often criticized.
Socially, the structure of families and communities was altered. The traditional rural way of life declined. In its place, new urban communities emerged, but these were often overcrowded and lacked sanitation. This led to the spread of disease. It's clear that the changes were profound.
In conclusion, while the industrial revolution brought about technological progress and economic growth, its social cost was significant. The period was complex, and its legacy is still debated by historians today. It definitely was a very important time.`
    },
    {
        title: "The Great Gatsby (A-Grade)",
        text: `F. Scott Fitzgerald's "The Great Gatsby" is not merely a story of unrequited love; it is a profound critique of the American Dream, revealing its inherent corruption and the hollowness at its core. Through the contrasting landscapes of West Egg, East Egg, and the Valley of Ashes, Fitzgerald constructs a moral geography where wealth is divorced from merit and happiness remains perpetually out of reach. Jay Gatsby, the novel's enigmatic protagonist, embodies the tragic paradox of the American Dream: he achieves immense wealth through illicit means in pursuit of an idealized past, only to find his dream disintegrates upon contact with reality.
The novel's symbolic structure is central to its critique. The green light at the end of Daisy's dock represents the unattainable future, the "orgastic future that year by year recedes before us." Gatsby's lavish parties, filled with anonymous guests, symbolize the superficiality and moral decay of the Jazz Age, a society obsessed with spectacle over substance. Furthermore, the eyes of Doctor T. J. Eckleburg, brooding over the Valley of Ashes, serve as a judgment from a god-like figure on the moral wasteland created by the relentless pursuit of wealth.
Ultimately, Gatsby's downfall illustrates the impossibility of recapturing the past and the destructive nature of an ideal built on illusion. Nick Carraway's closing reflection on being "borne back ceaselessly into the past" suggests a cynical view of progress, implying that the American Dream is a beautiful but destructive lie. Fitzgerald masterfully uses character, setting, and symbol to expose the dark underbelly of a supposedly meritocratic society, leaving the reader to question the very foundations of American identity.`
    },
    {
        title: "Climate Change (Needs work)",
        text: `Climate change is a big problem. The earth is getting hotter. This is because of greenhouse gases from cars and factories. Ice caps are melting and sea levels are rising. This will cause floods. We need to do something about it. People should use less energy. Governments should make laws. For example, they can support solar power. If we dont act now it will be too late. The future of our planet is at risk. Its everyones responsibility.`
    }
];


// To avoid making a real API call during UI development, we use a mock response.
// This should be moved to a separate file in a real application.
const MOCK_RESPONSE = {
  "meta": {
    "reading_time_minutes": 1,
    "estimated_grade_band": "B",
    "confidence": 0.85,
    "ultra_mode_used": false
  },
  "scores": {
    "thesis": 6, "argumentation": 5, "evidence": 4, "organization": 7,
    "style_and_voice": 5, "mechanics": 8, "citation_integrity": 0, "originality_risk": 2
  },
  "macro_feedback": {
    "thesis_quality": {
      "diagnosis": "The thesis is present but overly broad and lacks a specific, arguable claim.",
      "why_it_matters": "A strong thesis must be a debatable assertion that guides the entire essay.",
      "fix": "Narrow the focus. What specific aspect of the industrial revolution's impact will you argue?",
      "exemplar_rewrite": "While the Industrial Revolution spurred economic growth through technological innovation, its true legacy is defined by the profound and often detrimental social restructuring it forced upon urban working-class communities."
    },
    "argument_structure": {
      "diagnosis": "The essay follows a simple 'good vs. bad' structure which is functional but lacks analytical depth.",
      "outline_current": ["Intro", "Economic Effects (Good/Bad)", "Social Effects (Bad)", "Conclusion"],
      "outline_improved": ["Intro with new thesis", "The Myth of Universal Progress: Deconstructing 'cheaper goods'", "The Reality of Labor: From Artisan to Factory Worker", "The Social Cost: Public Health and Community Fragmentation", "Conclusion: Re-evaluating the 'Revolution'"]
    },
    "thematic_depth": {
      "diagnosis": "Analysis remains at a surface level, stating commonly known facts without deeper interpretation.",
      "missed_angles": ["The role of women and children in the workforce.", "Resistance movements and early labor unions.", "Environmental impact of industrialization."],
      "how_to_deepen": ["Incorporate a primary source, like a worker's diary or a political cartoon, to ground your analysis.", "Connect the historical events to a modern-day parallel."]
    },
    "evidence_use": {
      "gaps": ["No specific data, dates, or historical figures are mentioned.", "Claims like 'poor working conditions' need specific examples."],
      "irrelevancies": ["The essay is fairly focused, with no major irrelevancies."],
      "integration_tips": ["Introduce evidence with context. Instead of 'Factories were dangerous,' try 'According to historian John Doe, textile factories in Manchester reported...'"],
      "signal_phrases_examples": ["'This is evidenced by...'", "'A key example of this can be seen in...'", "'Historian Jane Smith argues that...'"]
    },
    "counterargument": {
      "missing_or_weak": "The essay acknowledges 'good effects' but doesn't engage with a serious counterargument, such as the view that the period's hardships were necessary for modern prosperity.",
      "stronger_counterclaims": ["Some historians argue that pre-industrial life was not idyllic and that factory work, despite its flaws, offered a form of economic freedom."],
      "rebuttals": ["Acknowledge this point, but pivot back by arguing that this 'freedom' came at the unacceptable cost of human dignity and safety, which spurred necessary reforms."]
    },
    "rubric_alignment": {
      "likely_pitfalls": ["If the rubric requires 'synthesis of evidence,' this essay would score poorly as it only lists general effects.", "Lacks the 'complexity' often required for top marks."],
      "targeted_moves_to_score_max": ["Integrate one specific case study (e.g., the Lowell Mill Girls).", "Use the 'exemplar_rewrite' thesis to show a clear, complex argument from the start."]
    }
  },
  "meso_feedback": [
    {
      "paragraph_index": 1,
      "topic_sentence_check": { "status": "clear", "rewrite": "The Industrial Revolution's primary economic outcome was a paradox: it created unprecedented national wealth while simultaneously entrenching exploitative labor conditions for the working class." },
      "logic_flow": { "issues": ["Jumps from 'cheaper goods' to 'poor working conditions' without a clear logical bridge."], "bridges": ["Add a transition: 'However, this mass production came at a human cost.'"] },
      "evidence_binding": { "quotes_or_data_needed": ["Specifics on wage decreases or accident rates in factories."], "analysis_depth_tip": "Instead of just stating conditions were bad, explain *why* they were bad from a systemic perspective (e.g., lack of regulation, power imbalance)." },
      "cohesion_score": 6
    }
  ],
  "micro_feedback": [
    {
      "sentence_index": 1,
      "original": "It changed society in many ways.",
      "issues": ["vagueness", "wordiness"],
      "rewrite_stronger": "It fundamentally reshaped societal structures.",
      "why_rewrite_is_better": "More concise and uses stronger, more academic vocabulary."
    },
    {
      "sentence_index": 2,
      "original": "For many people, life became very different.",
      "issues": ["vagueness"],
      "rewrite_stronger": "This transformation was particularly acute for the burgeoning urban populace.",
      "why_rewrite_is_better": "Specifies *who* was affected and uses more precise language."
    },
    {
      "sentence_index": 6,
      "original": "This is something that is often criticized.",
      "issues": ["passive_voice", "wordiness"],
      "rewrite_stronger": "Historians frequently criticize these labor practices.",
      "why_rewrite_is_better": "Uses active voice and identifies the critics, adding authority."
    },
    {
        "sentence_index": 11,
        "original": "It definitely was a very important time.",
        "issues": ["informal_tone", "vagueness"],
        "rewrite_stronger": "Ultimately, the era's importance lies in its complex and enduring legacy.",
        "why_rewrite_is_better": "More formal tone and specifies *why* it's important."
    }
  ],
  "style_tuning": {
    "target_style": "Concise Academic",
    "diction_suggestions": ["Replace 'good/bad' with 'beneficial/detrimental'.", "Replace 'changed' with 'transformed', 'altered', 'restructured'."],
    "syntax_variation_tips": ["Combine short sentences. 'Factories were built, and cities grew' could become 'The construction of factories fueled rapid urban expansion.'"],
    "tone_consistency_notes": ["Avoid conversational phrases like 'definitely' or 'very important.'"],
    "cadence_examples": ["'While one faction championed the advances, another decried the human cost.'"]
  },
  "citation_review": {
    "declared_style": "Unknown",
    "formatting_issues": ["No citations are present."],
    "missing_attributions": ["All claims about historical events are currently unsupported."],
    "works_cited_gaps": ["A works cited or bibliography page is required."],
    "examples_correct_format": ["In-text (MLA): (Hobsbawm 112).", "Works Cited (MLA): Hobsbawm, Eric. *The Age of Revolution: 1789-1848*. Vintage, 1996."]
  },
  "originality_and_claims": {
    "unsupported_claims": ["'People worked long hours in dangerous factories.' - needs a source.", "'New urban communities...lacked sanitation.' - needs evidence."],
    "checkable_facts": ["The entire essay consists of general claims that need to be substantiated with checkable facts (dates, statistics, specific events)."],
    "speculative_language_to_hedge": ["Not applicable, as the essay states claims as facts rather than speculating."],
    "originality_risk_rationale": "Low risk. The content is a standard, high-level summary of the topic. The risk would increase if specific, un-cited passages from other sources were used."
  },
  "prioritized_action_plan": [
    { "priority": "P0", "title": "Fortify Your Thesis", "why": "Your thesis is the foundation of your entire essay. A weak foundation means the entire argument is unstable.", "how": ["Use the 'exemplar_rewrite' as a starting point.", "Make sure your thesis makes a specific, debatable claim."] },
    { "priority": "P1", "title": "Inject Concrete Evidence", "why": "Without evidence, your arguments are just opinions. You need facts, examples, and data to be persuasive.", "how": ["For each body paragraph, find one specific statistic, quote, or historical example.", "Add citations for all evidence."] },
    { "priority": "P2", "title": "Refine Sentence-Level Prose", "why": "Clear, concise language makes your arguments more powerful and easier for the reader to follow.", "how": ["Address the specific 'micro_feedback' rewrites.", "Eliminate vague words like 'many ways', 'something', and 'very'."] }
  ],
  "one_pass_polish": {
    "global_rewrite_suggestions": ["Perform a 'search and replace' for weak verbs like 'was' and 'had' to find opportunities for more active language."],
    "transitions_pack": ["'Consequently,'", "'Furthermore,'", "'In contrast,'", "'This shift illustrates...'"],
    "thesis_plus_map_rewrite": "While the Industrial Revolution spurred economic growth through technological innovation, its true legacy is defined by the profound and often detrimental social restructuring it forced upon urban working-class communities, a process evident in the degradation of labor, the erosion of public health, and the fracturing of traditional community structures.",
    "elevated_conclusion_rewrite": "In retrospect, the Industrial Revolution was less a monolithic event than a complex series of trade-offs. While it laid the groundwork for modern economies, it also surfaced deep-seated conflicts between capital and labor, progress and well-being, that continue to shape contemporary debates. Therefore, its legacy is not merely historical, but a living blueprint of the societal challenges inherent to large-scale technological disruption."
  }
};