import "server-only";
import type { TryOnInput, TryOnProvider, TryOnStatus, TryOnSubmission } from "./provider";

export class RunPodTryOnProvider implements TryOnProvider {
  readonly name = "runpod-fashn-vton-1.5";
  constructor(
    private readonly endpointId = process.env.RUNPOD_ENDPOINT_ID,
    private readonly apiKey = process.env.RUNPOD_API_KEY,
  ) {}

  async submit(input: TryOnInput): Promise<TryOnSubmission> {
    if (!this.endpointId || !this.apiKey)
      throw new Error("RunPod no está configurado");
    const response = await fetch(
      `https://api.runpod.ai/v2/${this.endpointId}/run`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            person_image: input.personImage.toString("base64"),
            garment_image: input.garmentImage.toString("base64"),
            category: input.category,
          },
        }),
      },
    );
    if (!response.ok) throw new Error(`RunPod respondió ${response.status}`);
    const payload = (await response.json()) as { id?: string };
    if (!payload.id) throw new Error("RunPod no devolvió un job id");
    return { providerJobId: payload.id };
  }

  async status(providerJobId: string): Promise<TryOnStatus> {
    if (!this.endpointId || !this.apiKey) throw new Error("RunPod no está configurado");
    const response = await fetch(`https://api.runpod.ai/v2/${this.endpointId}/status/${providerJobId}`, { headers: { Authorization: `Bearer ${this.apiKey}` }, cache: "no-store" });
    if (!response.ok) throw new Error(`RunPod respondió ${response.status}`);
    const payload = (await response.json()) as { status?: string; output?: { result_image?: string }; error?: string };
    if (payload.status === "COMPLETED" && payload.output?.result_image)
      return { status: "COMPLETED", resultImage: Buffer.from(payload.output.result_image.replace(/^data:image\/\w+;base64,/, ""), "base64") };
    if (payload.status === "FAILED" || payload.status === "CANCELLED") return { status: "FAILED", error: payload.error || "La generación falló" };
    return { status: "PROCESSING" };
  }
}
