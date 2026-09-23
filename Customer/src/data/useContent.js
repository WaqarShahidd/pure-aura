import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { site } from '../config/site'
import { navigation } from '../config/navigation'
import { footerLinkGroups, footerAbout } from '../config/footerLinks'

// Site chrome: header, nav, footer, announcements, settings. One request, fetched once by
// Layout and effectively static for the session.
//
// The existing static config is passed as `initialData`, which is the important part. The
// header and footer are on EVERY page, so without a seed they would either flash empty on
// first paint or vanish entirely when the API is unreachable. With it, the chrome renders
// instantly from code and is quietly replaced by whatever the admin has published.
const FALLBACK = {
  settings: {
    name: site.name,
    tagline: site.tagline,
    currency: 'PKR',
    footerAbout,
    cartCopy: null,
    freeShippingThreshold: 28000,
    reservationMinutes: 10,
    footerPaymentIcons: site.paymentIcons,
  },
  announcements: site.announcements,
  socials: site.socials,
  navigation,
  footer: footerLinkGroups.map((group) => ({ title: group.title, links: group.links })),
}

export function useBootstrap() {
  const query = useQuery({
    queryKey: ['bootstrap'],
    queryFn: () => api('/bootstrap'),
    initialData: FALLBACK,
    staleTime: Infinity,
    // A failed refetch leaves initialData in place rather than blanking the chrome.
    retry: 1,
  })

  return query.data ?? FALLBACK
}

export function useHomepage() {
  return useQuery({
    queryKey: ['homepage'],
    queryFn: () => api('/homepage'),
    staleTime: 60_000,
  })
}

export function usePage(slug) {
  return useQuery({
    queryKey: ['pages', slug],
    queryFn: () => api(`/pages/${encodeURIComponent(slug)}`),
    enabled: Boolean(slug),
  })
}

export function useFaqs() {
  return useQuery({
    queryKey: ['faqs'],
    queryFn: () => api('/faqs'),
    staleTime: 60_000,
  })
}
