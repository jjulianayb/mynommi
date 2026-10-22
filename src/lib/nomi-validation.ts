import { z } from "zod";
export const emailSchema = z
  .string()
  .trim()
  .email("Confira o e-mail: use nome@exemplo.com.")
  .max(254);
export const passwordSchema = z
  .string()
  .min(8, "Use pelo menos 8 caracteres.")
  .max(128, "Use no máximo 128 caracteres.");
export const profileSchema = z.object({
  nickname: z.string().trim().min(2, "Seu apelido precisa ter pelo menos 2 letras.").max(30),
  city: z.string().trim().min(2, "Conte em qual cidade você mora.").max(80),
});
export function ageOn(birthday: string, today = new Date()) {
  const birth = new Date(birthday + "T12:00:00");
  if (!Number.isFinite(birth.getTime()) || birth > today) return -1;
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  )
    age--;
  return age;
}
export function passwordStrength(value: string) {
  return [
    value.length >= 8,
    /[A-Z]/.test(value),
    /[0-9]/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ].filter(Boolean).length;
}
