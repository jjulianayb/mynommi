import { ageOn, profileSchema } from './nomi-validation';

export const SIGNUP_INTERESTS = ['café', 'karaokê', 'vinho', 'cinema', 'trilhas', 'culinária', 'games', 'livros', 'música', 'viagens', 'séries', 'corrida'];

export function signupDetails(input: { nickname: string; city: string; birthday: string; interests: string[] }, today = new Date()) {
  const profile = profileSchema.safeParse(input);
  if (!profile.success) return { error: profile.error.issues[0]?.message ?? 'Confira seu nommi e sua cidade.' };
  const age = ageOn(input.birthday, today);
  if (age < 18 || age > 120) return { error: age >= 0 && age < 18 ? 'O Nommi é para quem tem 18 anos ou mais.' : 'Confira sua data de nascimento.' };
  const interests = [...new Set(input.interests)].filter(i => SIGNUP_INTERESTS.includes(i));
  if (interests.length !== 3) return { error: 'Escolha 3 interesses para encontrar sua teia.' };
  return { data: { ...profile.data, birthday: input.birthday, interests } };
}

export function isRealHost(user: { isBusiness: boolean } | null, demoMode: boolean) {
  return user?.isBusiness === true && !demoMode;
}

export function presentationDemo(search: string) {
  return new URLSearchParams(search).get('demo') === '1';
}