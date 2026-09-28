import type { LucideIcon } from 'lucide-react-native';
import {
  Banknote,
  Briefcase,
  Car,
  FileText,
  HelpCircle,
  Home,
  Landmark,
  ShoppingCart,
} from 'lucide-react-native';

import type { CaseCategory, DocumentVaultCategory } from '@/types';
import { colors } from './theme';

export interface CategoryMeta {
  id: CaseCategory;
  label: string;
  description: string;
  icon: LucideIcon;
  emoji: string;
  color: string;
  backgroundColor: string;
}

export const CATEGORY_META: Record<CaseCategory, CategoryMeta> = {
  boete: {
    id: 'boete',
    label: 'Boete',
    description: 'Verkeer, parkeren en gemeente',
    icon: Car,
    emoji: '🚗',
    color: '#2B5FCF',
    backgroundColor: '#E8EEFC',
  },
  werk: {
    id: 'werk',
    label: 'Werk',
    description: 'Ontslag, loon en arbeidscontract',
    icon: Briefcase,
    emoji: '💼',
    color: '#0E7C86',
    backgroundColor: '#E4F2F1',
  },
  contract: {
    id: 'contract',
    label: 'Contract',
    description: 'Controleren, maken en opzeggen',
    icon: FileText,
    emoji: '📄',
    color: '#6D4EA8',
    backgroundColor: '#EEE8F7',
  },
  wonen: {
    id: 'wonen',
    label: 'Wonen',
    description: 'Huur, verhuurder en borg',
    icon: Home,
    emoji: '🏠',
    color: '#C8760A',
    backgroundColor: '#FCF0DE',
  },
  aankopen: {
    id: 'aankopen',
    label: 'Aankopen',
    description: 'Garantie, retour en abonnementen',
    icon: ShoppingCart,
    emoji: '🛒',
    color: '#C3402F',
    backgroundColor: '#FBEAE7',
  },
  geld: {
    id: 'geld',
    label: 'Geld',
    description: 'Betalingen en claims',
    icon: Banknote,
    emoji: '💰',
    color: '#1B8A5A',
    backgroundColor: '#E7F5EE',
  },
  overheid: {
    id: 'overheid',
    label: 'Overheid',
    description: 'Besluiten, bezwaar en gemeente',
    icon: Landmark,
    emoji: '🏛️',
    color: colors.primary,
    backgroundColor: '#E7E9F0',
  },
  anders: {
    id: 'anders',
    label: 'Anders',
    description: 'Iets anders juridisch',
    icon: HelpCircle,
    emoji: '⚖️',
    color: '#6B7280',
    backgroundColor: '#F0F0EF',
  },
};

export const CATEGORY_ORDER: CaseCategory[] = [
  'boete',
  'werk',
  'contract',
  'wonen',
  'aankopen',
  'geld',
  'overheid',
  'anders',
];

export interface DocumentCategoryMeta {
  id: DocumentVaultCategory;
  label: string;
  emoji: string;
  color: string;
  backgroundColor: string;
}

export const DOCUMENT_CATEGORY_META: Record<DocumentVaultCategory, DocumentCategoryMeta> = {
  werk: { id: 'werk', label: 'Werk', emoji: '💼', color: '#0E7C86', backgroundColor: '#E4F2F1' },
  wonen: { id: 'wonen', label: 'Wonen', emoji: '🏠', color: '#C8760A', backgroundColor: '#FCF0DE' },
  contracten: {
    id: 'contracten',
    label: 'Contracten',
    emoji: '📄',
    color: '#6D4EA8',
    backgroundColor: '#EEE8F7',
  },
  overheid: {
    id: 'overheid',
    label: 'Overheid',
    emoji: '🏛️',
    color: colors.primary,
    backgroundColor: '#E7E9F0',
  },
  identiteit: {
    id: 'identiteit',
    label: 'Identiteit',
    emoji: '🪪',
    color: '#C3402F',
    backgroundColor: '#FBEAE7',
  },
  mijn_zaken: {
    id: 'mijn_zaken',
    label: 'Mijn Zaken',
    emoji: '⚖️',
    color: '#1B8A5A',
    backgroundColor: '#E7F5EE',
  },
};

export const DOCUMENT_CATEGORY_ORDER: DocumentVaultCategory[] = [
  'werk',
  'wonen',
  'contracten',
  'overheid',
  'identiteit',
  'mijn_zaken',
];
