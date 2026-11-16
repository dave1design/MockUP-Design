/**
 * Who is behind this project, shown in the "Developer" section and the footer.
 * Fill these in. Social links left empty are hidden on the published site
 * (and shown as dashed placeholders while developing).
 */
export type SocialKey = 'github' | 'x' | 'linkedin' | 'instagram' | 'telegram' | 'behance' | 'dribbble' | 'youtube';

interface Developer {
  name: string;
  role: string;
  bio: string;
  email: string;
  repo: string;
  socials: Record<SocialKey, string>;
}

export const developer: Developer = {
  name: 'Your name',
  role: 'Designer & developer',
  bio: 'I built Mockup Studio so designers can present their work without fighting with design tools. It is free, private and open source.',
  /** Where "Send a mockup" emails go. */
  email: '',
  /** Public repository, e.g. https://github.com/you/mockup-studio */
  repo: '',
  socials: {
    github: '',
    x: '',
    linkedin: '',
    instagram: '',
    telegram: '',
    behance: '',
    dribbble: '',
    youtube: '',
  },
};
