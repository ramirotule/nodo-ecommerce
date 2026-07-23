export type BulkTextField =
  | "nombre"
  | "marca"
  | "descripcion"
  | "descripcion_corta"
  | "descrip_provee";

export type CapitalizeMode = "none" | "title" | "upper" | "lower" | "sentence";

export interface TextTransformOptions {
  prefix?: string;
  suffix?: string;
  find?: string;
  replace?: string;
  removeEmojis?: boolean;
  trimSpaces?: boolean;
  collapseSpaces?: boolean;
  capitalize?: CapitalizeMode;
}

const EMOJI_REGEX = /\p{Extended_Pictographic}/gu;

export function removeEmojis(text: string): string {
  return text.replace(EMOJI_REGEX, "").replace(/\uFE0F/g, "");
}

export function collapseSpaces(text: string): string {
  return text.replace(/\s+/g, " ");
}

export function capitalizeTitle(text: string): string {
  return text.replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

export function capitalizeSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function applyTextTransform(text: string, options: TextTransformOptions): string {
  let result = text;

  if (options.find) {
    result = result.split(options.find).join(options.replace ?? "");
  }

  if (options.removeEmojis) {
    result = removeEmojis(result);
  }

  if (options.collapseSpaces) {
    result = collapseSpaces(result);
  }

  if (options.trimSpaces) {
    result = result.trim();
  }

  switch (options.capitalize) {
    case "title":
      result = capitalizeTitle(result);
      break;
    case "upper":
      result = result.toUpperCase();
      break;
    case "lower":
      result = result.toLowerCase();
      break;
    case "sentence":
      result = capitalizeSentence(result);
      break;
    default:
      break;
  }

  if (options.prefix) {
    result = options.prefix + result;
  }

  if (options.suffix) {
    result = result + options.suffix;
  }

  return result;
}

export function getProductFieldValue(
  product: Partial<Record<BulkTextField, string | undefined>>,
  field: BulkTextField
): string {
  return product[field] ?? "";
}

export {
  generateProductSlug,
  resolveProductSlug,
  slugifyText,
  uniqueProductSlug,
} from "@/lib/product-slug";
