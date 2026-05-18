export type FieldType = 'text' | 'textarea' | 'url' | 'color' | 'select' | 'image' | 'boolean' | 'array';

export interface FieldDef {
  type: FieldType;
  label: string;
  placeholder?: string;
  maxLength?: number;
  options?: string[];
  fields?: Record<string, FieldDef>;
}

export type SectionPropSchema = Record<string, FieldDef>;
export type SectionPropSchemasMap = Record<string, SectionPropSchema>;

export const SECTION_PROP_SCHEMAS: SectionPropSchemasMap = {
  hero: {
    heading: { type: 'text', label: 'Headline', placeholder: 'Welcome to our site', maxLength: 80 },
    subheading: { type: 'textarea', label: 'Subheadline', placeholder: 'A brief description...', maxLength: 200 },
    cta_text: { type: 'text', label: 'Button Text', placeholder: 'Get Started', maxLength: 30 },
    cta_link: { type: 'url', label: 'Button URL', placeholder: 'https://' },
    layout: { type: 'select', label: 'Layout', options: ['centered', 'split'] },
    background_image: { type: 'image', label: 'Background Image', placeholder: 'https://...' },
  },

  features: {
    heading: { type: 'text', label: 'Heading', placeholder: 'Our Features', maxLength: 80 },
    subheading: { type: 'textarea', label: 'Subheading', placeholder: 'What we offer...', maxLength: 200 },
    features: {
      type: 'array',
      label: 'Features',
      fields: {
        title: { type: 'text', label: 'Title', maxLength: 60 },
        description: { type: 'textarea', label: 'Description', maxLength: 300 },
        icon: { type: 'text', label: 'Icon (emoji)', placeholder: '\u2728', maxLength: 10 },
      },
    },
  },

  pricing: {
    heading: { type: 'text', label: 'Heading', placeholder: 'Pricing Plans', maxLength: 80 },
    plans: {
      type: 'array',
      label: 'Plans',
      fields: {
        name: { type: 'text', label: 'Plan Name', maxLength: 40 },
        price: { type: 'text', label: 'Price', placeholder: '$29', maxLength: 20 },
        period: { type: 'text', label: 'Period', placeholder: 'month', maxLength: 10 },
        features: { type: 'text', label: 'Feature (comma-separated)', placeholder: 'Feature 1, Feature 2', maxLength: 500 },
        cta: { type: 'text', label: 'Button Text', maxLength: 30 },
        highlighted: { type: 'boolean', label: 'Highlighted' },
      },
    },
  },

  testimonials: {
    heading: { type: 'text', label: 'Heading', placeholder: 'What People Say', maxLength: 80 },
    testimonials: {
      type: 'array',
      label: 'Testimonials',
      fields: {
        name: { type: 'text', label: 'Name', maxLength: 50 },
        role: { type: 'text', label: 'Role', maxLength: 50 },
        company: { type: 'text', label: 'Company', maxLength: 50 },
        quote: { type: 'textarea', label: 'Quote', maxLength: 500 },
      },
    },
  },

  faq: {
    heading: { type: 'text', label: 'Heading', placeholder: 'FAQ', maxLength: 80 },
    items: {
      type: 'array',
      label: 'FAQ Items',
      fields: {
        question: { type: 'text', label: 'Question', maxLength: 200 },
        answer: { type: 'textarea', label: 'Answer', maxLength: 1000 },
      },
    },
  },

  contact_form: {
    heading: { type: 'text', label: 'Heading', placeholder: 'Contact Us', maxLength: 80 },
    subheading: { type: 'textarea', label: 'Subheading', maxLength: 200 },
    name_placeholder: { type: 'text', label: 'Name Placeholder', maxLength: 40 },
    email_placeholder: { type: 'text', label: 'Email Placeholder', maxLength: 40 },
    button_text: { type: 'text', label: 'Button Text', maxLength: 30 },
  },

  gallery: {
    heading: { type: 'text', label: 'Heading', placeholder: 'Gallery', maxLength: 80 },
    images: {
      type: 'array',
      label: 'Images',
      fields: {
        src: { type: 'url', label: 'Image URL', placeholder: 'https://...' },
        alt: { type: 'text', label: 'Alt Text', maxLength: 100 },
        caption: { type: 'text', label: 'Caption', maxLength: 100 },
      },
    },
  },

  team: {
    heading: { type: 'text', label: 'Heading', placeholder: 'Our Team', maxLength: 80 },
    members: {
      type: 'array',
      label: 'Members',
      fields: {
        name: { type: 'text', label: 'Name', maxLength: 50 },
        role: { type: 'text', label: 'Role', maxLength: 50 },
        bio: { type: 'textarea', label: 'Bio', maxLength: 300 },
        avatar: { type: 'image', label: 'Avatar URL', placeholder: 'https://...' },
      },
    },
  },

  cta_banner: {
    heading: { type: 'text', label: 'Heading', placeholder: 'Ready?', maxLength: 80 },
    subheading: { type: 'textarea', label: 'Subheading', maxLength: 200 },
    button_text: { type: 'text', label: 'Button Text', maxLength: 30 },
    button_link: { type: 'url', label: 'Button URL', placeholder: 'https://' },
    background_color: { type: 'color', label: 'Background Color' },
  },

  stats: {
    heading: { type: 'text', label: 'Heading', placeholder: 'By the Numbers', maxLength: 80 },
    stats: {
      type: 'array',
      label: 'Stats',
      fields: {
        value: { type: 'text', label: 'Value', placeholder: '10K+', maxLength: 20 },
        label: { type: 'text', label: 'Label', placeholder: 'Customers', maxLength: 40 },
      },
    },
  },

  logo_strip: {
    heading: { type: 'text', label: 'Heading', placeholder: 'Trusted By', maxLength: 80 },
    logos: {
      type: 'array',
      label: 'Logos',
      fields: {
        src: { type: 'url', label: 'Logo URL', placeholder: 'https://...' },
        alt: { type: 'text', label: 'Alt Text', maxLength: 100 },
        width: { type: 'text', label: 'Width (px)', placeholder: '120', maxLength: 10 },
      },
    },
  },

  footer: {
    copyright: { type: 'text', label: 'Copyright Text', maxLength: 100 },
    columns: {
      type: 'array',
      label: 'Link Columns',
      fields: {
        title: { type: 'text', label: 'Column Title', maxLength: 40 },
        links: { type: 'text', label: 'Links (comma: Label>URL)', placeholder: 'About>/about, Contact>/contact', maxLength: 500 },
      },
    },
    social: {
      type: 'array',
      label: 'Social Links',
      fields: {
        platform: { type: 'text', label: 'Platform', placeholder: 'Twitter', maxLength: 30 },
        url: { type: 'url', label: 'URL', placeholder: 'https://' },
      },
    },
  },
};

export function getSectionSchema(type: string): SectionPropSchema {
  return SECTION_PROP_SCHEMAS[type] ?? {};
}

export const SECTION_TYPE_LABELS: Record<string, string> = {
  hero: 'Hero',
  features: 'Features',
  pricing: 'Pricing',
  testimonials: 'Testimonials',
  faq: 'FAQ',
  contact_form: 'Contact',
  gallery: 'Gallery',
  team: 'Team',
  cta_banner: 'CTA Banner',
  stats: 'Stats',
  logo_strip: 'Logo Strip',
  footer: 'Footer',
};
