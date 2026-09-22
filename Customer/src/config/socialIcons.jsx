import TwitterIcon from '@mui/icons-material/Twitter'
import FacebookIcon from '@mui/icons-material/Facebook'
import PinterestIcon from '@mui/icons-material/Pinterest'
import InstagramIcon from '@mui/icons-material/Instagram'

// Maps site.socials[].icon to its component. Shared by AnnouncementBar and Footer, which each
// held their own copy of this map.
export const SOCIAL_ICONS = {
  x: TwitterIcon,
  facebook: FacebookIcon,
  pinterest: PinterestIcon,
  instagram: InstagramIcon,
}
