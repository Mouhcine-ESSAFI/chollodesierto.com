import {Analytics, getShopAnalytics, useNonce} from '@shopify/hydrogen';
import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {
  Outlet,
  useRouteError,
  isRouteErrorResponse,
  type ShouldRevalidateFunction,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from 'react-router';
import faviconFallback from '~/assets/favicon.svg';
import tailwindCss from '~/styles/tailwind.css?url';
import {
  SF_SITE_SETTINGS_QUERY,
  SF_MENUS_QUERY,
  mapSiteSettings,
  mapMenu,
  primaryDomainHost,
} from '~/lib/admin-queries';
import {UI_STRINGS_QUERY, mapUiStrings} from '~/lib/ui-strings';

export type RootLoader = typeof loader;

export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod, currentUrl, nextUrl,
}) => {
  if (formMethod && formMethod !== 'GET') return true;
  if (currentUrl.toString() === nextUrl.toString()) return true;
  return false;
};

export function links() {
  return [
    {rel: 'stylesheet', href: tailwindCss},
    {rel: 'preconnect', href: 'https://cdn.shopify.com'},
    {rel: 'preconnect', href: 'https://fonts.googleapis.com'},
    {rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' as const},
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Patua+One&family=Nunito:wght@400;600;700;800&display=swap',
    },
    // The favicon is NOT here: links() is static, so it cannot read the
    // Shopify value. Layout renders it instead, below.
  ];
}

export async function loader({context}: LoaderFunctionArgs) {
  const {storefront, customerAccount, cart, env} = context;

  // Loaded here rather than per-route because SiteNavbar/SiteFooter render on
  // every page.
  const [settingsRes, menuRes, footerMenuRes, uiStringsRes] = await Promise.all([
    storefront.query(SF_SITE_SETTINGS_QUERY).catch(() => null),
    storefront
      .query(SF_MENUS_QUERY, {variables: {handle: 'main-menu'}})
      .catch(() => null),
    storefront
      .query(SF_MENUS_QUERY, {variables: {handle: 'footer'}})
      .catch(() => null),
    storefront.query(UI_STRINGS_QUERY).catch(() => null),
  ]);

  // Both the myshopify domain and the primary domain count as "this site".
  const internalHosts = [env.PUBLIC_STORE_DOMAIN, primaryDomainHost(settingsRes)];

  return {
    siteSettings: mapSiteSettings(settingsRes),
    uiStrings: mapUiStrings(uiStringsRes),
    mainMenu: mapMenu(menuRes, internalHosts),
    footerMenu: mapMenu(footerMenuRes, internalHosts),
    cart: cart.get(),
    isLoggedIn: customerAccount.isLoggedIn(),
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    shop: getShopAnalytics({storefront, publicStorefrontId: env.PUBLIC_STOREFRONT_ID}).catch(() => null),
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      withPrivacyBanner: false,
      country: context.storefront.i18n.country,
      language: context.storefront.i18n.language,
    },
  };
}

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();
  const data = useRouteLoaderData<RootLoader>('root');
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {/* Set in Admin > Content > Metaobjects > Site Settings. Rendered here
            rather than in links(), which is static and cannot see loader data.
            The bundled SVG is the fallback, so a store with no favicon
            uploaded still gets one. */}
        <link
          rel="icon"
          type={
            (data?.siteSettings?.faviconUrl ?? '').endsWith('.png')
              ? 'image/png'
              : 'image/svg+xml'
          }
          href={data?.siteSettings?.faviconUrl || faviconFallback}
        />
        <Meta />
        <Links />
      </head>
      <body>
        {data?.shop ? (
          <Analytics.Provider cart={data.cart} shop={data.shop} consent={data.consent}>
            {children}
          </Analytics.Provider>
        ) : children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  let errorMessage = 'Unknown error';
  let errorStatus = 500;
  if (isRouteErrorResponse(error)) {
    errorMessage = error?.data?.message ?? error.data;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F5EDE0'}}>
      <div style={{textAlign:'center'}}>
        <p style={{fontSize:'6rem',color:'#C45A2C',fontFamily:'sans-serif'}}>{errorStatus}</p>
        <p style={{color:'#1A1F2E'}}>{errorMessage}</p>
      </div>
    </div>
  );
}
