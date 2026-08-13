import type { Schema, Struct } from '@strapi/strapi';

export interface SharedButton extends Struct.ComponentSchema {
  collectionName: 'components_shared_buttons';
  info: {
    displayName: 'button';
  };
  attributes: {
    style: Schema.Attribute.String;
    text: Schema.Attribute.String;
    url: Schema.Attribute.String;
  };
}

export interface SharedContact extends Struct.ComponentSchema {
  collectionName: 'components_shared_contacts';
  info: {
    displayName: 'contact';
  };
  attributes: {
    icon: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    title: Schema.Attribute.String;
    url: Schema.Attribute.String;
    value: Schema.Attribute.String;
  };
}

export interface SharedCostItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_cost_items';
  info: {
    displayName: 'cost_item';
    icon: 'connector';
  };
  attributes: {
    description: Schema.Attribute.Text;
  };
}

export interface SharedEquipment extends Struct.ComponentSchema {
  collectionName: 'components_shared_equipment';
  info: {
    displayName: 'equipment';
  };
  attributes: {
    category: Schema.Attribute.String;
    name: Schema.Attribute.String;
    recommended: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
  };
}

export interface SharedGallery extends Struct.ComponentSchema {
  collectionName: 'components_shared_galleries';
  info: {
    displayName: 'gallery';
  };
  attributes: {
    caption: Schema.Attribute.String;
    image: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    >;
  };
}

export interface SharedHero extends Struct.ComponentSchema {
  collectionName: 'components_shared_heroes';
  info: {
    displayName: 'Hero';
  };
  attributes: {
    background_image: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    button: Schema.Attribute.Component<'shared.button', true>;
    subtitle: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface SharedHighlights extends Struct.ComponentSchema {
  collectionName: 'components_shared_highlights';
  info: {
    displayName: 'highlights';
    icon: 'volumeUp';
  };
  attributes: {
    description: Schema.Attribute.Text;
    icon: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    >;
    title: Schema.Attribute.String;
  };
}

export interface SharedItienary extends Struct.ComponentSchema {
  collectionName: 'components_shared_itienaries';
  info: {
    displayName: 'itinerary';
  };
  attributes: {
    accommodation: Schema.Attribute.String;
    altitude: Schema.Attribute.String;
    day: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    distance: Schema.Attribute.String;
    meals: Schema.Attribute.String;
    title: Schema.Attribute.String;
    walking_hours: Schema.Attribute.String;
  };
}

export interface SharedMedia extends Struct.ComponentSchema {
  collectionName: 'components_shared_media';
  info: {
    displayName: 'Media';
    icon: 'file-video';
  };
  attributes: {
    file: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
  };
}

export interface SharedNavigation extends Struct.ComponentSchema {
  collectionName: 'components_shared_navigations';
  info: {
    displayName: 'navigation';
  };
  attributes: {
    display_order: Schema.Attribute.Integer;
    mega_menu: Schema.Attribute.String;
    page: Schema.Attribute.String;
    title: Schema.Attribute.String;
    type: Schema.Attribute.String;
    url: Schema.Attribute.String;
  };
}

export interface SharedPermit extends Struct.ComponentSchema {
  collectionName: 'components_shared_permits';
  info: {
    displayName: 'permit';
  };
  attributes: {
    cost: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    name: Schema.Attribute.String;
  };
}

export interface SharedPriceTier extends Struct.ComponentSchema {
  collectionName: 'components_shared_price_tiers';
  info: {
    displayName: 'price-tier';
  };
  attributes: {
    maximum_people: Schema.Attribute.Integer;
    minimum_people: Schema.Attribute.Integer;
    price: Schema.Attribute.Decimal;
  };
}

export interface SharedQuote extends Struct.ComponentSchema {
  collectionName: 'components_shared_quotes';
  info: {
    displayName: 'Quote';
    icon: 'indent';
  };
  attributes: {
    body: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface SharedRichText extends Struct.ComponentSchema {
  collectionName: 'components_shared_rich_texts';
  info: {
    description: '';
    displayName: 'Rich text';
    icon: 'align-justify';
  };
  attributes: {
    body: Schema.Attribute.RichText;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: '';
    displayName: 'Seo';
    icon: 'allergies';
    name: 'Seo';
  };
  attributes: {
    canonical: Schema.Attribute.String;
    keywords: Schema.Attribute.String;
    metaDescription: Schema.Attribute.Text & Schema.Attribute.Required;
    metaTitle: Schema.Attribute.String & Schema.Attribute.Required;
    shareImage: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedSlider extends Struct.ComponentSchema {
  collectionName: 'components_shared_sliders';
  info: {
    description: '';
    displayName: 'Slider';
    icon: 'address-book';
  };
  attributes: {
    files: Schema.Attribute.Media<'images', true>;
  };
}

export interface SharedSocialLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_social_links';
  info: {
    displayName: 'social-link';
  };
  attributes: {
    platform: Schema.Attribute.String;
    url: Schema.Attribute.String;
  };
}

export interface SharedTopBar extends Struct.ComponentSchema {
  collectionName: 'components_shared_top_bars';
  info: {
    displayName: 'top-bar';
  };
  attributes: {
    email: Schema.Attribute.Email;
    notice: Schema.Attribute.String;
    phone: Schema.Attribute.String;
    whatsapp: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'shared.button': SharedButton;
      'shared.contact': SharedContact;
      'shared.cost-item': SharedCostItem;
      'shared.equipment': SharedEquipment;
      'shared.gallery': SharedGallery;
      'shared.hero': SharedHero;
      'shared.highlights': SharedHighlights;
      'shared.itienary': SharedItienary;
      'shared.media': SharedMedia;
      'shared.navigation': SharedNavigation;
      'shared.permit': SharedPermit;
      'shared.price-tier': SharedPriceTier;
      'shared.quote': SharedQuote;
      'shared.rich-text': SharedRichText;
      'shared.seo': SharedSeo;
      'shared.slider': SharedSlider;
      'shared.social-link': SharedSocialLink;
      'shared.top-bar': SharedTopBar;
    }
  }
}
