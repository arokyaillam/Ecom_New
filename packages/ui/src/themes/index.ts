import { foodTheme } from './food/tokens.js';
import { clothingTheme } from './clothing/tokens.js';
import { appliancesTheme } from './appliances/tokens.js';

export type ThemeType = 'food' | 'clothing' | 'appliances';

export interface ThemeTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
  };
  font: string;
  radius: string;
}

export interface ThemeConfig {
  tokens: ThemeTokens;
  productCard: string;
  heroSection: string;
  categoryDisplay: string;
  homeSections: string[];
}

export const themeRegistry: Record<ThemeType, ThemeConfig> = {
  food: {
    tokens: foodTheme,
    productCard: 'FoodCard',
    heroSection: 'FoodHero',
    categoryDisplay: 'MenuSection',
    homeSections: ['HeroSection', 'CategoryMenuSection', 'FeaturedDishesSection', 'PopularSection'],
  },
  clothing: {
    tokens: clothingTheme,
    productCard: 'LookbookCard',
    heroSection: 'EditorialHero',
    categoryDisplay: 'StyleGrid',
    homeSections: ['EditorialHeroSection', 'NewArrivalsSection', 'CategoryStyleGrid', 'TrendingSection'],
  },
  appliances: {
    tokens: appliancesTheme,
    productCard: 'SpecCard',
    heroSection: 'ProductHero',
    categoryDisplay: 'CategoryList',
    homeSections: ['ProductHeroSection', 'ShopByCategorySection', 'FeaturedSpecsSection', 'BrandTrustSection'],
  },
};

export function resolveTheme(
  themeType: ThemeType,
  overrides?: Partial<ThemeTokens['colors']> & { fontFamily?: string; borderRadius?: number }
): ThemeTokens {
  const preset = themeRegistry[themeType].tokens;
  return {
    colors: {
      primary: overrides?.primary ?? preset.colors.primary,
      secondary: overrides?.secondary ?? preset.colors.secondary,
      accent: overrides?.accent ?? preset.colors.accent,
      bg: overrides?.bg ?? preset.colors.bg,
      surface: overrides?.surface ?? preset.colors.surface,
      text: overrides?.text ?? preset.colors.text,
      textSecondary: overrides?.textSecondary ?? preset.colors.textSecondary,
      border: overrides?.border ?? preset.colors.border,
    },
    font: overrides?.fontFamily ?? preset.font,
    radius: overrides?.borderRadius !== undefined ? `${overrides.borderRadius}px` : preset.radius,
  };
}

const SAFE_FONT = /^[a-zA-Z0-9,\s"'-]{1,200}$/;
const SAFE_HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const SAFE_RGBA = /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*[01]?\.\d+\s*\)$/;

function sanitizeCssValue(value: string, type: 'font' | 'color'): string {
  if (type === 'font') {
    if (!SAFE_FONT.test(value)) return 'Inter, sans-serif';
    return value;
  }
  if (!SAFE_HEX.test(value) && !SAFE_RGBA.test(value)) return '#000000';
  return value;
}

export function themeToCssVars(theme: ThemeTokens): Record<string, string> {
  return {
    '--color-primary': sanitizeCssValue(theme.colors.primary, 'color'),
    '--color-secondary': sanitizeCssValue(theme.colors.secondary, 'color'),
    '--color-accent': sanitizeCssValue(theme.colors.accent, 'color'),
    '--color-bg': sanitizeCssValue(theme.colors.bg, 'color'),
    '--color-surface': sanitizeCssValue(theme.colors.surface, 'color'),
    '--color-text': sanitizeCssValue(theme.colors.text, 'color'),
    '--color-text-secondary': sanitizeCssValue(theme.colors.textSecondary, 'color'),
    '--color-border': sanitizeCssValue(theme.colors.border, 'color'),
    '--font-family': `'${sanitizeCssValue(theme.font, 'font')}', Georgia, serif`,
    '--radius-base': theme.radius,
  };
}

export { foodTheme, clothingTheme, appliancesTheme };