const fs = require('fs');
const updates = {
  en: {
    search: {
      subtitle: "Check availability across multiple TLDs at once.",
      inputPlaceholder: "e.g. spacex",
      buttonActive: "Search all variants",
      buttonLoading: "Searching…",
      errorRetry: "Retry",
      loadingText: "Querying registrars and WHOIS…",
      updatingText: "Updating remaining checks…"
    }
  },
  'pt-br': {
    search: {
      subtitle: "Verifique a disponibilidade em vários TLDs de uma vez.",
      inputPlaceholder: "ex: spacex",
      buttonActive: "Buscar todas variantes",
      buttonLoading: "Buscando…",
      errorRetry: "Tentar novamente",
      loadingText: "Consultando registradores e WHOIS…",
      updatingText: "Atualizando verificações restantes…"
    }
  },
  es: {
    search: {
      subtitle: "Verifica la disponibilidad en múltiples TLDs a la vez.",
      inputPlaceholder: "ej: spacex",
      buttonActive: "Buscar todas las variantes",
      buttonLoading: "Buscando…",
      errorRetry: "Reintentar",
      loadingText: "Consultando registradores y WHOIS…",
      updatingText: "Actualizando verificaciones restantes…"
    }
  },
  fr: {
    search: {
      subtitle: "Vérifiez la disponibilité sur plusieurs TLDs à la fois.",
      inputPlaceholder: "ex: spacex",
      buttonActive: "Chercher toutes les variantes",
      buttonLoading: "Recherche…",
      errorRetry: "Réessayer",
      loadingText: "Interrogation des registraires et WHOIS…",
      updatingText: "Mise à jour des vérifications restantes…"
    }
  }
};

for (const [lang, data] of Object.entries(updates)) {
  const path = `./src/locales/${lang}/translation.json`;
  const current = JSON.parse(fs.readFileSync(path, 'utf8'));
  current.search = { ...current.search, ...data.search };
  fs.writeFileSync(path, JSON.stringify(current, null, 2));
}
