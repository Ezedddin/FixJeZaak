export interface OnboardingSlide {
  id: string;
  emoji: string;
  title: string;
  description: string;
}

export const onboardingSlides: OnboardingSlide[] = [
  {
    id: 'slide_1',
    emoji: '⚖️',
    title: 'Juridische problemen.\nSimpel geregeld.',
    description:
      'Van parkeerboete tot arbeidsconflict — FixJeZaak begrijpt jouw situatie en regelt het voor je.',
  },
  {
    id: 'slide_2',
    emoji: '💬',
    title: 'Vertel wat er speelt.',
    description:
      'Onze AI stelt de juiste vragen, leest je documenten en bouwt jouw zaak op. Geen juridisch jargon.',
  },
  {
    id: 'slide_3',
    emoji: '✅',
    title: 'Van probleem naar oplossing.',
    description:
      'Wij sturen bezwaren, stellen brieven op en houden je op de hoogte. Jij hoeft niks van de wet te weten.',
  },
];
