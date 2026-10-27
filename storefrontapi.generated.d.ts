/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as StorefrontAPI from '@shopify/hydrogen/storefront-api-types';

export type SfMenuQueryVariables = StorefrontAPI.Exact<{
  handle: StorefrontAPI.Scalars['String']['input'];
}>;

export type SfMenuQuery = {
  menu?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Menu, 'id' | 'title'> & {
      items: Array<Pick<StorefrontAPI.MenuItem, 'id' | 'title' | 'url'>>;
    }
  >;
};

export type SfPageSectionsQueryVariables = StorefrontAPI.Exact<{
  [key: string]: never;
}>;

export type SfPageSectionsQuery = {
  metaobjects: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'id' | 'handle'> & {
        fields: Array<
          Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'> & {
            reference?: StorefrontAPI.Maybe<{
              image?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.Image, 'url' | 'altText'>
              >;
            }>;
            references?: StorefrontAPI.Maybe<{
              nodes: Array<{
                image?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'url' | 'altText'>
                >;
              }>;
            }>;
          }
        >;
      }
    >;
  };
};

export type SfJourneyDaysQueryVariables = StorefrontAPI.Exact<{
  [key: string]: never;
}>;

export type SfJourneyDaysQuery = {
  metaobjects: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'id' | 'handle'> & {
        fields: Array<
          Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'> & {
            reference?: StorefrontAPI.Maybe<
              | {
                  image?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.Image, 'url' | 'altText'>
                  >;
                }
              | (Pick<StorefrontAPI.Metaobject, 'handle'> & {
                  fields: Array<
                    Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>
                  >;
                })
            >;
            references?: StorefrontAPI.Maybe<{
              nodes: Array<{
                image?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.Image, 'url' | 'altText'>
                >;
              }>;
            }>;
          }
        >;
      }
    >;
  };
};

export type SfTourProductQueryVariables = StorefrontAPI.Exact<{
  handle: StorefrontAPI.Scalars['String']['input'];
}>;

export type SfTourProductQuery = {
  product?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Product, 'id'> & {
      variants: {
        nodes: Array<{
          price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
          selectedOptions: Array<
            Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
          >;
        }>;
      };
    }
  >;
};

export type SfSiteSettingsQueryVariables = StorefrontAPI.Exact<{
  [key: string]: never;
}>;

export type SfSiteSettingsQuery = {
  shop: {primaryDomain: Pick<StorefrontAPI.Domain, 'host'>};
  metaobjects: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'id' | 'handle'> & {
        fields: Array<Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>>;
      }
    >;
  };
};

export type MoneyFragment = Pick<
  StorefrontAPI.MoneyV2,
  'currencyCode' | 'amount'
>;

export type CartLineFragment = Pick<
  StorefrontAPI.CartLine,
  'id' | 'quantity'
> & {
  attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
  cost: {
    totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    amountPerQuantity: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
  };
  merchandise: Pick<
    StorefrontAPI.ProductVariant,
    'id' | 'availableForSale' | 'requiresShipping' | 'title'
  > & {
    compareAtPrice?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
    price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    image?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
    >;
    product: Pick<StorefrontAPI.Product, 'handle' | 'title' | 'id' | 'vendor'>;
    selectedOptions: Array<
      Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
    >;
  };
};

export type CartLineComponentFragment = Pick<
  StorefrontAPI.ComponentizableCartLine,
  'id' | 'quantity'
> & {
  attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
  cost: {
    totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    amountPerQuantity: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
  };
  merchandise: Pick<
    StorefrontAPI.ProductVariant,
    'id' | 'availableForSale' | 'requiresShipping' | 'title'
  > & {
    compareAtPrice?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
    price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    image?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
    >;
    product: Pick<StorefrontAPI.Product, 'handle' | 'title' | 'id' | 'vendor'>;
    selectedOptions: Array<
      Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
    >;
  };
};

export type CartApiQueryFragment = Pick<
  StorefrontAPI.Cart,
  'updatedAt' | 'id' | 'checkoutUrl' | 'totalQuantity' | 'note'
> & {
  appliedGiftCards: Array<
    Pick<StorefrontAPI.AppliedGiftCard, 'lastCharacters'> & {
      amountUsed: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    }
  >;
  buyerIdentity: Pick<
    StorefrontAPI.CartBuyerIdentity,
    'countryCode' | 'email' | 'phone'
  > & {
    customer?: StorefrontAPI.Maybe<
      Pick<
        StorefrontAPI.Customer,
        'id' | 'email' | 'firstName' | 'lastName' | 'displayName'
      >
    >;
  };
  lines: {
    nodes: Array<
      | (Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
          attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
          cost: {
            totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
            amountPerQuantity: Pick<
              StorefrontAPI.MoneyV2,
              'currencyCode' | 'amount'
            >;
            compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
            >;
          };
          merchandise: Pick<
            StorefrontAPI.ProductVariant,
            'id' | 'availableForSale' | 'requiresShipping' | 'title'
          > & {
            compareAtPrice?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
            >;
            price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
            image?: StorefrontAPI.Maybe<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
            product: Pick<
              StorefrontAPI.Product,
              'handle' | 'title' | 'id' | 'vendor'
            >;
            selectedOptions: Array<
              Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
            >;
          };
        })
      | (Pick<StorefrontAPI.ComponentizableCartLine, 'id' | 'quantity'> & {
          attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
          cost: {
            totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
            amountPerQuantity: Pick<
              StorefrontAPI.MoneyV2,
              'currencyCode' | 'amount'
            >;
            compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
            >;
          };
          merchandise: Pick<
            StorefrontAPI.ProductVariant,
            'id' | 'availableForSale' | 'requiresShipping' | 'title'
          > & {
            compareAtPrice?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
            >;
            price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
            image?: StorefrontAPI.Maybe<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
            product: Pick<
              StorefrontAPI.Product,
              'handle' | 'title' | 'id' | 'vendor'
            >;
            selectedOptions: Array<
              Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
            >;
          };
        })
    >;
  };
  cost: {
    subtotalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    totalDutyAmount?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
    totalTaxAmount?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
  };
  attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
  discountCodes: Array<
    Pick<StorefrontAPI.CartDiscountCode, 'code' | 'applicable'>
  >;
};

export type MenuItemFragment = Pick<
  StorefrontAPI.MenuItem,
  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
>;

export type ChildMenuItemFragment = Pick<
  StorefrontAPI.MenuItem,
  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
>;

export type ParentMenuItemFragment = Pick<
  StorefrontAPI.MenuItem,
  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
> & {
  items: Array<
    Pick<
      StorefrontAPI.MenuItem,
      'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
    >
  >;
};

export type MenuFragment = Pick<StorefrontAPI.Menu, 'id'> & {
  items: Array<
    Pick<
      StorefrontAPI.MenuItem,
      'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
    > & {
      items: Array<
        Pick<
          StorefrontAPI.MenuItem,
          'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
        >
      >;
    }
  >;
};

export type ShopFragment = Pick<
  StorefrontAPI.Shop,
  'id' | 'name' | 'description'
> & {
  primaryDomain: Pick<StorefrontAPI.Domain, 'url'>;
  brand?: StorefrontAPI.Maybe<{
    logo?: StorefrontAPI.Maybe<{
      image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
    }>;
  }>;
};

export type HeaderQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  headerMenuHandle: StorefrontAPI.Scalars['String']['input'];
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type HeaderQuery = {
  shop: Pick<StorefrontAPI.Shop, 'id' | 'name' | 'description'> & {
    primaryDomain: Pick<StorefrontAPI.Domain, 'url'>;
    brand?: StorefrontAPI.Maybe<{
      logo?: StorefrontAPI.Maybe<{
        image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
      }>;
    }>;
  };
  menu?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Menu, 'id'> & {
      items: Array<
        Pick<
          StorefrontAPI.MenuItem,
          'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
        > & {
          items: Array<
            Pick<
              StorefrontAPI.MenuItem,
              'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
            >
          >;
        }
      >;
    }
  >;
};

export type FooterQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  footerMenuHandle: StorefrontAPI.Scalars['String']['input'];
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type FooterQuery = {
  menu?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Menu, 'id'> & {
      items: Array<
        Pick<
          StorefrontAPI.MenuItem,
          'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
        > & {
          items: Array<
            Pick<
              StorefrontAPI.MenuItem,
              'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
            >
          >;
        }
      >;
    }
  >;
};

export type TourRoutesQueryVariables = StorefrontAPI.Exact<{
  [key: string]: never;
}>;

export type TourRoutesQuery = {
  metaobjects: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'id' | 'handle'> & {
        fields: Array<
          Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'> & {
            reference?: StorefrontAPI.Maybe<{
              image?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.Image, 'url' | 'altText'>
              >;
            }>;
          }
        >;
      }
    >;
  };
};

export type CampTiersQueryVariables = StorefrontAPI.Exact<{
  [key: string]: never;
}>;

export type CampTiersQuery = {
  metaobjects: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'id' | 'handle'> & {
        fields: Array<
          Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'> & {
            reference?: StorefrontAPI.Maybe<{
              image?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.Image, 'url' | 'altText'>
              >;
            }>;
          }
        >;
      }
    >;
  };
};

export type FaqsQueryVariables = StorefrontAPI.Exact<{[key: string]: never}>;

export type FaqsQuery = {
  metaobjects: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'id'> & {
        fields: Array<Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>>;
      }
    >;
  };
};

export type ReviewsQueryVariables = StorefrontAPI.Exact<{[key: string]: never}>;

export type ReviewsQuery = {
  metaobjects: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'id'> & {
        fields: Array<Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>>;
      }
    >;
  };
};

export type BlogArticlesQueryVariables = StorefrontAPI.Exact<{
  blogHandle: StorefrontAPI.Scalars['String']['input'];
  first: StorefrontAPI.Scalars['Int']['input'];
}>;

export type BlogArticlesQuery = {
  blog?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Blog, 'title' | 'handle'> & {
      articles: {
        nodes: Array<
          Pick<
            StorefrontAPI.Article,
            'id' | 'handle' | 'title' | 'excerpt' | 'publishedAt'
          > & {
            image?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Image, 'url' | 'altText'>
            >;
            authorV2?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.ArticleAuthor, 'name'>
            >;
          }
        >;
      };
    }
  >;
};

export type BlogArticleQueryVariables = StorefrontAPI.Exact<{
  blogHandle: StorefrontAPI.Scalars['String']['input'];
  articleHandle: StorefrontAPI.Scalars['String']['input'];
}>;

export type BlogArticleQuery = {
  blog?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Blog, 'handle'> & {
      articleByHandle?: StorefrontAPI.Maybe<
        Pick<
          StorefrontAPI.Article,
          'id' | 'handle' | 'title' | 'contentHtml' | 'excerpt' | 'publishedAt'
        > & {
          image?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Image, 'url' | 'altText'>
          >;
          authorV2?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.ArticleAuthor, 'name'>
          >;
          seo?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Seo, 'title' | 'description'>
          >;
        }
      >;
    }
  >;
};

export type SfUiStringsQueryVariables = StorefrontAPI.Exact<{
  [key: string]: never;
}>;

export type SfUiStringsQuery = {
  metaobjects: {
    nodes: Array<{
      fields: Array<Pick<StorefrontAPI.MetaobjectField, 'key' | 'value'>>;
    }>;
  };
};

interface GeneratedQueryTypes {
  '#graphql\n  query SfMenu($handle: String!) {\n    menu(handle: $handle) {\n      id\n      title\n      items { id title url }\n    }\n  }\n': {
    return: SfMenuQuery;
    variables: SfMenuQueryVariables;
  };
  '#graphql\n  query SfPageSections {\n    metaobjects(type: "page_section", first: 100) {\n      nodes {\n        id\n        handle\n        fields {\n          key\n          value\n          reference { ... on MediaImage { image { url altText } } }\n          references(first: 10) {\n            nodes { ... on MediaImage { image { url altText } } }\n          }\n        }\n      }\n    }\n  }\n': {
    return: SfPageSectionsQuery;
    variables: SfPageSectionsQueryVariables;
  };
  '#graphql\n  query SfJourneyDays {\n    metaobjects(type: "journey_day", first: 50) {\n      nodes {\n        id\n        handle\n        fields {\n          key\n          value\n          reference {\n            ... on MediaImage { image { url altText } }\n            ... on Metaobject { handle fields { key value } }\n          }\n          references(first: 5) {\n            nodes { ... on MediaImage { image { url altText } } }\n          }\n        }\n      }\n    }\n  }\n': {
    return: SfJourneyDaysQuery;
    variables: SfJourneyDaysQueryVariables;
  };
  '#graphql\n  query SfTourProduct($handle: String!) {\n    product(handle: $handle) {\n      id\n      variants(first: 100) {\n        nodes {\n          price { amount currencyCode }\n          selectedOptions { name value }\n        }\n      }\n    }\n  }\n': {
    return: SfTourProductQuery;
    variables: SfTourProductQueryVariables;
  };
  '#graphql\n  query SfSiteSettings {\n    # primaryDomain rides along here so menu URLs can be internalised without a\n    # second round trip — Shopify resolves FRONTPAGE menu items to the primary\n    # domain, not the myshopify one.\n    shop { primaryDomain { host } }\n    metaobjects(type: "site_settings", first: 1) {\n      nodes { id handle fields { key value } }\n    }\n  }\n': {
    return: SfSiteSettingsQuery;
    variables: SfSiteSettingsQueryVariables;
  };
  '#graphql\n  fragment Shop on Shop {\n    id\n    name\n    description\n    primaryDomain {\n      url\n    }\n    brand {\n      logo {\n        image {\n          url\n        }\n      }\n    }\n  }\n  query Header(\n    $country: CountryCode\n    $headerMenuHandle: String!\n    $language: LanguageCode\n  ) @inContext(language: $language, country: $country) {\n    shop {\n      ...Shop\n    }\n    menu(handle: $headerMenuHandle) {\n      ...Menu\n    }\n  }\n  #graphql\n  fragment MenuItem on MenuItem {\n    id\n    resourceId\n    tags\n    title\n    type\n    url\n  }\n  fragment ChildMenuItem on MenuItem {\n    ...MenuItem\n  }\n  fragment ParentMenuItem on MenuItem {\n    ...MenuItem\n    items {\n      ...ChildMenuItem\n    }\n  }\n  fragment Menu on Menu {\n    id\n    items {\n      ...ParentMenuItem\n    }\n  }\n\n': {
    return: HeaderQuery;
    variables: HeaderQueryVariables;
  };
  '#graphql\n  query Footer(\n    $country: CountryCode\n    $footerMenuHandle: String!\n    $language: LanguageCode\n  ) @inContext(language: $language, country: $country) {\n    menu(handle: $footerMenuHandle) {\n      ...Menu\n    }\n  }\n  #graphql\n  fragment MenuItem on MenuItem {\n    id\n    resourceId\n    tags\n    title\n    type\n    url\n  }\n  fragment ChildMenuItem on MenuItem {\n    ...MenuItem\n  }\n  fragment ParentMenuItem on MenuItem {\n    ...MenuItem\n    items {\n      ...ChildMenuItem\n    }\n  }\n  fragment Menu on Menu {\n    id\n    items {\n      ...ParentMenuItem\n    }\n  }\n\n': {
    return: FooterQuery;
    variables: FooterQueryVariables;
  };
  '#graphql\n  query TourRoutes {\n    metaobjects(type: "tour_route", first: 10) {\n      nodes {\n        id\n        handle\n        fields {\n          key\n          value\n          reference {\n            ... on MediaImage {\n              image {\n                url(transform: { maxWidth: 900, preferredContentType: WEBP })\n                altText\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n': {
    return: TourRoutesQuery;
    variables: TourRoutesQueryVariables;
  };
  '#graphql\n  query CampTiers {\n    metaobjects(type: "camp_tier", first: 10) {\n      nodes {\n        id\n        handle\n        fields {\n          key\n          value\n          reference {\n            ... on MediaImage {\n              image {\n                url(transform: { maxWidth: 900, preferredContentType: WEBP })\n                altText\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n': {
    return: CampTiersQuery;
    variables: CampTiersQueryVariables;
  };
  '#graphql\n  query Faqs {\n    metaobjects(type: "faq_item", first: 20) {\n      nodes {\n        id\n        fields { key value }\n      }\n    }\n  }\n': {
    return: FaqsQuery;
    variables: FaqsQueryVariables;
  };
  '#graphql\n  query Reviews {\n    metaobjects(type: "review", first: 20) {\n      nodes {\n        id\n        fields { key value }\n      }\n    }\n  }\n': {
    return: ReviewsQuery;
    variables: ReviewsQueryVariables;
  };
  '#graphql\n  query BlogArticles($blogHandle: String!, $first: Int!) {\n    blog(handle: $blogHandle) {\n      title\n      handle\n      articles(first: $first, sortKey: PUBLISHED_AT, reverse: true) {\n        nodes {\n          id\n          handle\n          title\n          excerpt\n          publishedAt\n          image { url altText }\n          authorV2 { name }\n        }\n      }\n    }\n  }\n': {
    return: BlogArticlesQuery;
    variables: BlogArticlesQueryVariables;
  };
  '#graphql\n  query BlogArticle($blogHandle: String!, $articleHandle: String!) {\n    blog(handle: $blogHandle) {\n      handle\n      articleByHandle(handle: $articleHandle) {\n        id\n        handle\n        title\n        contentHtml\n        excerpt\n        publishedAt\n        image { url altText }\n        authorV2 { name }\n        seo { title description }\n      }\n    }\n  }\n': {
    return: BlogArticleQuery;
    variables: BlogArticleQueryVariables;
  };
  '#graphql\n  query SfUiStrings {\n    metaobjects(type: "ui_string", first: 250) {\n      nodes { fields { key value } }\n    }\n  }\n': {
    return: SfUiStringsQuery;
    variables: SfUiStringsQueryVariables;
  };
}

interface GeneratedMutationTypes {}

declare module '@shopify/hydrogen' {
  interface StorefrontQueries extends GeneratedQueryTypes {}
  interface StorefrontMutations extends GeneratedMutationTypes {}
}
