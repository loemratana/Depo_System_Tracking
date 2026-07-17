const PLACEHOLDER_URLS = new Set([
  "https://example.com/avatar.jpg",
  "https://example.com/avatar.png",
]);

export function getInitials(name?: string, fallback = "U") {
  if (!name?.trim()) return fallback.slice(0, 2).toUpperCase();
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function isValidAvatarSrc(src?: string | null): src is string {
  if (!src?.trim()) return false;
  const normalized = src.trim();
  if (PLACEHOLDER_URLS.has(normalized)) return false;
  return normalized.startsWith("http") || normalized.startsWith("blob:") || normalized.startsWith("data:");
}

export function getAvatarUrl(options: {
  src?: string | null;
  name?: string;
  email?: string;
  id?: string | number;
}) {
  if (isValidAvatarSrc(options.src)) {
    return options.src.trim();
  }

  const seed = encodeURIComponent(
    options.name?.trim() || options.email?.trim() || String(options.id ?? "user"),
  );
  return `https://avatar.vercel.sh/${seed}.png`;
}
