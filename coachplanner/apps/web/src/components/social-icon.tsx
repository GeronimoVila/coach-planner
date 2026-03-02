import { 
  FaWhatsapp, 
  FaInstagram, 
  FaTiktok, 
  FaFacebook, 
  FaGlobe, 
  FaYoutube,
  FaShoppingCart
} from 'react-icons/fa';
import { LinkIcon } from 'lucide-react';

interface DynamicLinkIconProps {
  url: string;
  className?: string;
}

export function DynamicLinkIcon({ url, className = "h-4 w-4" }: DynamicLinkIconProps) {
  if (!url) return <LinkIcon className={className} />;

  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('whatsapp.com') || lowerUrl.includes('wa.me')) {
    return <FaWhatsapp className={`${className} text-[#25D366]`} />;
  }
  if (lowerUrl.includes('instagram.com')) {
    return <FaInstagram className={`${className} text-[#E1306C]`} />;
  }
  if (lowerUrl.includes('tiktok.com')) {
    return <FaTiktok className={`${className} text-black`} />;
  }
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com')) {
    return <FaFacebook className={`${className} text-[#1877F2]`} />;
  }
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return <FaYoutube className={`${className} text-[#FF0000]`} />;
  }

  if (
    lowerUrl.includes('tienda') || 
    lowerUrl.includes('shop') || 
    lowerUrl.includes('store') || 
    lowerUrl.includes('mercadolibre') || 
    lowerUrl.includes('mercadoshops')
  ) {
    return <FaShoppingCart className={`${className} text-orange-500`} />;
  }

  return <FaGlobe className={`${className} text-gray-500`} />;
}