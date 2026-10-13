import { categoryHue } from "@/lib/format";

/** Post cover image, or a coloured panel with the title when there is none. */
export default function PostCover({ post, className = "" }: { post: any; className?: string }) {
  if (post.cover_url) return <img src={post.cover_url} alt="" className={`h-full w-full object-cover ${className}`} />;
  const hue = categoryHue(post.title || "");
  return (
    <div
      className={`grid h-full w-full place-items-center p-4 text-center font-display text-lg font-bold text-white/90 ${className}`}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 80% 55%), hsl(${(hue + 60) % 360} 75% 35%))` }}
    >
      <span className="line-clamp-3">{post.title}</span>
    </div>
  );
}
