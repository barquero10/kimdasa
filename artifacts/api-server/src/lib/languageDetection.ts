const SPANISH_PATTERNS = [
  /\b(hola|gracias|buenos|buenas|por favor|necesito|quiero|tengo|cómo|como|qué|que|cuánto|cuanto|ayuda|puedo|puede|servicio|precio|presupuesto|techo|siding|ventana|puerta|trabajo|casa|hogar|usted|nosotros|tenemos|tienen|está|estoy|estamos)\b/i,
  /\b(soy|me llamo|mi nombre|mi casa|mi techo|mi hogar|para|con|sin|más|menos|muy|también|ahora|aquí|allí|pero|porque|cuando|donde|cómo|cuándo)\b/i,
  /[áéíóúüñ¿¡]/,
];

export function detectLanguage(text: string): "en" | "es" {
  let score = 0;
  for (const pattern of SPANISH_PATTERNS) {
    if (pattern.test(text)) score++;
  }
  return score >= 1 ? "es" : "en";
}

export function detectLanguageFromMessages(
  messages: Array<{ role: string; content: string }>
): "en" | "es" {
  const userMessages = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");
  return detectLanguage(userMessages);
}
