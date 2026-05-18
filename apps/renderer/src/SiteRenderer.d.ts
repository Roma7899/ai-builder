import type { SiteJSON } from './types/site.types';
interface Props {
    siteJson: SiteJSON;
    highlightedSectionId?: string;
    onSectionClick?: (sectionId: string) => void;
}
export default function SiteRenderer({ siteJson, highlightedSectionId, onSectionClick }: Props): import("react").JSX.Element;
export {};
