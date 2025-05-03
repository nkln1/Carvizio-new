import { z } from "zod";

// Validare avansată pentru parole
export const passwordSchema = z.string()
  .min(8, {
    message: "Parola trebuie să conțină cel puțin 8 caractere.",
  })
  .regex(/[A-Z]/, {
    message: "Parola trebuie să conțină cel puțin o literă mare.",
  })
  .regex(/[a-z]/, {
    message: "Parola trebuie să conțină cel puțin o literă mică.",
  })
  .regex(/[0-9]/, {
    message: "Parola trebuie să conțină cel puțin o cifră.",
  });

// Funcție pentru validarea parolelor
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("Parola trebuie să conțină cel puțin 8 caractere.");
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("Parola trebuie să conțină cel puțin o literă mare.");
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("Parola trebuie să conțină cel puțin o literă mică.");
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push("Parola trebuie să conțină cel puțin o cifră.");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};