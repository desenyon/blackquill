
export interface AnalysisResponse {
  meta: Meta;
  scores: Scores;
  macro_feedback: MacroFeedback;
  meso_feedback: MesoFeedback[];
  micro_feedback: MicroFeedback[];
  style_tuning: StyleTuning;
  citation_review: CitationReview;
  originality_and_claims: OriginalityAndClaims;
  prioritized_action_plan: ActionPlanItem[];
  one_pass_polish: OnePassPolish;
  ultra_extras?: UltraExtras;
}

export interface Meta {
  reading_time_minutes: number;
  estimated_grade_band: "A" | "B" | "C" | "Unclear";
  confidence: number;
  ultra_mode_used: boolean;
}

export interface Scores {
  thesis: number;
  argumentation: number;
  evidence: number;
  organization: number;
  style_and_voice: number;
  mechanics: number;
  citation_integrity: number;
  originality_risk: number;
}

export interface MacroFeedback {
  thesis_quality: { diagnosis: string; why_it_matters: string; fix: string; exemplar_rewrite: string };
  argument_structure: { diagnosis: string; outline_current: string[]; outline_improved: string[] };
  thematic_depth: { diagnosis: string; missed_angles: string[]; how_to_deepen: string[] };
  evidence_use: { gaps: string[]; irrelevancies: string[]; integration_tips: string[]; signal_phrases_examples: string[] };
  counterargument: { missing_or_weak: string; stronger_counterclaims: string[]; rebuttals: string[] };
  rubric_alignment: { likely_pitfalls: string[]; targeted_moves_to_score_max: string[] };
}

export interface MesoFeedback {
  paragraph_index: number;
  topic_sentence_check: { status: "clear" | "vague" | "missing"; rewrite: string };
  logic_flow: { issues: string[]; bridges: string[] };
  evidence_binding: { quotes_or_data_needed: string[]; analysis_depth_tip: string };
  cohesion_score: number;
}

export type MicroIssue = "wordiness" | "passive_voice" | "ambiguous_pronoun" | "comma_splice" | "unsupported_claim" | "tone_mismatch" | "citation_missing" | "tense_shift";

export interface MicroFeedback {
  sentence_index: number;
  original: string;
  issues: MicroIssue[];
  rewrite_stronger: string;
  why_rewrite_is_better: string;
}

export interface StyleTuning {
  target_style: string;
  diction_suggestions: string[];
  syntax_variation_tips: string[];
  tone_consistency_notes: string[];
  cadence_examples: string[];
}

export interface CitationReview {
  declared_style: "MLA" | "APA" | "Chicago" | "Unknown";
  formatting_issues: string[];
  missing_attributions: string[];
  works_cited_gaps: string[];
  examples_correct_format: string[];
}

export interface OriginalityAndClaims {
  unsupported_claims: string[];
  checkable_facts: string[];
  speculative_language_to_hedge: string[];
  originality_risk_rationale: string;
}

export interface ActionPlanItem {
  priority: "P0" | "P1" | "P2";
  title: string;
  why: string;
  how: string[];
}

export interface OnePassPolish {
  global_rewrite_suggestions: string[];
  transitions_pack: string[];
  thesis_plus_map_rewrite: string;
  elevated_conclusion_rewrite: string;
}

export interface UltraExtras {
  assumption_stress_tests: string[];
  alternatives_to_thesis: string[];
  high_impact_additions: string[];
  examiner_trap_questions: string[];
}

export interface EssayInputs {
    essay_text: string;
    prompt?: string;
    rubric?: string;
    style_target?: string;
    constraints?: string;
    ultra: boolean;
}
