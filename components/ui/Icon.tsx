"use client";

import { forwardRef } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Heart,
  Info,
  Leaf,
  Lightbulb,
  LocateFixed,
  type LucideIcon,
  type LucideProps,
  MapPin,
  Navigation,
  Phone,
  RotateCw,
  Route,
  Search,
  Share2,
  SlidersHorizontal,
  Smartphone,
  Star,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";

/**
 * House defaults for the whole app: a calmer 1.75 stroke and 18px base size for
 * a quiet, Apple-HIG feel. Icons are decorative by default (aria-hidden) because
 * they sit next to text/labels or inside an IconButton that owns the aria-label.
 * Call-sites can override any prop (size, strokeWidth, className, aria-label …).
 */
function styled(Base: LucideIcon, displayName: string): LucideIcon {
  const Wrapped = forwardRef<SVGSVGElement, LucideProps>(function Wrapped(
    props,
    ref,
  ) {
    return (
      <Base
        ref={ref}
        size={18}
        strokeWidth={1.75}
        aria-hidden="true"
        {...props}
      />
    );
  });
  Wrapped.displayName = displayName;
  return Wrapped as unknown as LucideIcon;
}

export const IconArrowLeft = styled(ArrowLeft, "IconArrowLeft");
export const IconBookOpen = styled(BookOpen, "IconBookOpen");
export const IconCheck = styled(Check, "IconCheck");
export const IconChevronDown = styled(ChevronDown, "IconChevronDown");
export const IconChevronRight = styled(ChevronRight, "IconChevronRight");
export const IconDownload = styled(Download, "IconDownload");
export const IconExternalLink = styled(ExternalLink, "IconExternalLink");
export const IconHeart = styled(Heart, "IconHeart");
export const IconInfo = styled(Info, "IconInfo");
export const IconLeaf = styled(Leaf, "IconLeaf");
export const IconLightbulb = styled(Lightbulb, "IconLightbulb");
export const IconLocate = styled(LocateFixed, "IconLocate");
export const IconMapPin = styled(MapPin, "IconMapPin");
export const IconNavigation = styled(Navigation, "IconNavigation");
export const IconPhone = styled(Phone, "IconPhone");
export const IconRotate = styled(RotateCw, "IconRotate");
export const IconRoute = styled(Route, "IconRoute");
export const IconSearch = styled(Search, "IconSearch");
export const IconShare = styled(Share2, "IconShare");
export const IconFilter = styled(SlidersHorizontal, "IconFilter");
export const IconSmartphone = styled(Smartphone, "IconSmartphone");
export const IconStar = styled(Star, "IconStar");
export const IconWarning = styled(TriangleAlert, "IconWarning");
export const IconClose = styled(X, "IconClose");
export const IconZap = styled(Zap, "IconZap");
