// Tes options de recherche (issues de ton image "Recherche avancée")
// Ce sont les SEULES options proposées dans le menu déroulant.
export const SERVICES = [
  {
    id: "email",
    label: "Email",
    description: "Recherche à partir d'une adresse email",
    emoji: "📧",
    placeholder: "exemple@domaine.com",
    field: "Email",
  },
  {
    id: "phone",
    label: "Téléphone",
    description: "Recherche à partir d'un numéro de téléphone",
    emoji: "📱",
    placeholder: "+33 6 12 34 56 78",
    field: "Numéro",
  },
  {
    id: "fullname",
    label: "Prénom + Nom",
    description: "Recherche à partir d'une identité complète",
    emoji: "👤",
    placeholder: "Jean Dupont",
    field: "Prénom + Nom",
  },
  {
    id: "username",
    label: "Username",
    description: "Recherche à partir d'un pseudo / username",
    emoji: "🔎",
    placeholder: "@pseudo",
    field: "Username",
  },
];

export function getService(id) {
  return SERVICES.find((s) => s.id === id);
}
