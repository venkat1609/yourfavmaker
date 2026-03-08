import { Link } from 'react-router-dom';

interface Props {
  title: string;
  subtitle: string;
  image: string;
  tag: string;
  align?: 'left' | 'right';
}

export default function CategoryBanner({ title, subtitle, image, tag, align = 'left' }: Props) {
  return (
    <Link
      to={`/shop?tag=${encodeURIComponent(tag)}`}
      className="group block overflow-hidden rounded-sm animate-fade-in"
    >
      <div className={`relative flex ${align === 'right' ? 'flex-row-reverse' : 'flex-row'} min-h-[320px] md:min-h-[400px]`}>
        <div className="absolute inset-0 md:relative md:w-1/2">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        </div>
        <div className="relative z-10 flex flex-col justify-center p-8 md:p-12 md:w-1/2 bg-background/80 md:bg-card backdrop-blur-sm md:backdrop-blur-none">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Collection</p>
          <h2 className="text-3xl md:text-4xl font-heading mb-3">{title}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-md">{subtitle}</p>
          <span className="mt-6 text-sm font-medium underline underline-offset-4 decoration-accent group-hover:decoration-foreground transition-colors">
            Shop now
          </span>
        </div>
      </div>
    </Link>
  );
}
