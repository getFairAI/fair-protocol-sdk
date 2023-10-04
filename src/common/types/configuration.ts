export interface Configuration {
  generateAssets?: 'fair-protocol' | 'rareweave' | 'none';
  assetNames?: string[];
  customTags?: { name: string; value: string }[];
  negativePrompt?: string;
  nImages?: number;
  title?: string;
  description?: string;
  rareweaveConfig?: {
    royalty: number;
  };
}
