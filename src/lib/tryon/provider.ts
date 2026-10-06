export type TryOnCategory = "tops" | "bottoms" | "one-pieces";

export type TryOnInput = {
  personImage: Buffer;
  garmentImage: Buffer;
  category: TryOnCategory;
};

export type TryOnSubmission = { providerJobId: string };
export type TryOnStatus = { status: "PROCESSING" | "COMPLETED" | "FAILED"; resultImage?: Buffer; error?: string };

export interface TryOnProvider {
  readonly name: string;
  submit(input: TryOnInput): Promise<TryOnSubmission>;
  status(providerJobId: string): Promise<TryOnStatus>;
}
