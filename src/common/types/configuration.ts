export interface Configuration {
  createAtomicAssets?: boolean;
  assetNames?: string[];
  customTags?: { name: string; value: string }[];
  negativePrompt?: string;
  nImages?: number;
  title?: string;
  description?: string;
}
