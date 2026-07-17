// Depot names are not unique — different districts/provinces can have a depot
// with the same name — so dropdown labels always append the geography.
export function formatDepotLabel(
  name: string,
  district?: string | null,
  province?: string | null,
): string {
  const geography = [district, province].filter(Boolean).join(", ");
  return geography ? `${name} — ${geography}` : name;
}
