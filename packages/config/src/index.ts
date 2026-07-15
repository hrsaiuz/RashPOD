export const officialSocialLinks = Object.freeze({
  instagram: "https://instagram.com/therashpod",
  telegram: "https://t.me/therashpod",
});

export type OfficialSocialNetwork = keyof typeof officialSocialLinks;

export const officialSocialAccessibleNames: Record<OfficialSocialNetwork, string> = Object.freeze({
  instagram: "RashPOD on Instagram",
  telegram: "RashPOD on Telegram",
});
