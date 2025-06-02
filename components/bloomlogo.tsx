import { cn } from '@/utils/helpers';

interface BloomLogoProps {
  className?: string;
}

/**
 * Renders the Bloom logo as an SVG element.
 *
 * @param className - Optional CSS class name(s) to apply to the SVG for custom styling.
 * @returns The SVG representation of the Bloom logo.
 */
export default function BloomLogo({ className }: BloomLogoProps) {
  return (
    <svg
      width="19"
      height="11"
      viewBox="0 0 19 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      <path
        d="M12.7058 8.11476L17.3696 3.44247L15.3338 1.40296L10.94 5.80476V0H8.05999V5.80476L3.66619 1.40296L1.63039 3.44247L6.29419 8.11476H0.5V11H6.26541C6.31401 9.20031 7.78279 7.75409 9.59 7.75409C11.3972 7.75409 12.8678 9.20031 12.9146 11H18.5V8.11476H12.7058Z"
        className="fill-current"
      />
    </svg>
  );
}
