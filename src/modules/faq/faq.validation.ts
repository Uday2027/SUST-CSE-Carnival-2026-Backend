import { z } from 'zod';

export const askQuestionSchema = z.object({
    teamName: z.string().min(1, 'Team name is required'),
    leaderEmail: z.string().email('Valid leader email is required'),
    question: z.string(),
});

export const answerQuestionSchema = z.object({
    answer: z.string().min(1, 'Answer is required'),
});

export type AskQuestionInput = z.infer<typeof askQuestionSchema>;
export type AnswerQuestionInput = z.infer<typeof answerQuestionSchema>;
