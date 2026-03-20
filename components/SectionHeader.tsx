type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function SectionHeader({ eyebrow, title, description }: SectionHeaderProps) {
  return (
    <div className="space-y-3">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-highlight">{eyebrow}</p>
      ) : null}
      <h2 className="text-2xl font-semibold text-white sm:text-3xl">{title}</h2>
      {description ? <p className="max-w-2xl text-sm leading-7 text-white/65 sm:text-base">{description}</p> : null}
    </div>
  );
}
