import { ageOn, profileSchema } from "./nomi-validation";
import { INTERESSES_NO_CADASTRO } from "./perfil-texto";

export const SIGNUP_INTERESTS = [
  "café",
  "karaokê",
  "vinho",
  "cinema",
  "trilhas",
  "culinária",
  "games",
  "livros",
  "música",
  "viagens",
  "séries",
  "corrida",
  "arte",
  "dança",
  "fotografia",
  "yoga",
  "pets",
  "futebol",
  "ciclismo",
  "shows",
  "teatro",
  "natureza",
  "churrasco",
  "cerveja",
  "jogos de mesa",
  "idiomas",
  "voluntariado",
  "academia",
];

export function signupDetails(
  input: { nickname: string; city: string; birthday: string; interests: string[] },
  today = new Date(),
) {
  const profile = profileSchema.safeParse(input);
  if (!profile.success)
    return { error: profile.error.issues[0]?.message ?? "Confira seu nommi e sua cidade." };
  const age = ageOn(input.birthday, today);
  if (age < 18 || age > 120)
    return {
      error:
        age >= 0 && age < 18
          ? "O Nommi é para quem tem 18 anos ou mais."
          : "Confira sua data de nascimento.",
    };
  const interests = [...new Set(input.interests)].filter((i) => SIGNUP_INTERESTS.includes(i));
  // Três é o mínimo para a fila ter de onde partir; seis é onde o cadastro
  // ainda é curto. Quem quiser mais põe até 12 depois, em Meu nommi.
  if (interests.length < INTERESSES_NO_CADASTRO.minimo)
    return { error: "Escolha pelo menos 3 interesses para a gente saber por onde começar." };
  if (interests.length > INTERESSES_NO_CADASTRO.maximo)
    return { error: "Por aqui, até 6. Você põe o resto depois, no seu nommi." };
  return { data: { ...profile.data, birthday: input.birthday, interests } };
}

export function isRealHost(user: { isBusiness: boolean } | null, demoMode: boolean) {
  return user?.isBusiness === true && !demoMode;
}

export function presentationDemo(search: string) {
  return new URLSearchParams(search).get("demo") === "1";
}
