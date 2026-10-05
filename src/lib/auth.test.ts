import { describe,expect,it } from "vitest";
import { hashToken } from "./auth";

describe("session security",()=>{it("stores a deterministic hash, never the raw token",()=>{const raw="private-session-token";const hash=hashToken(raw);expect(hash).toHaveLength(64);expect(hash).not.toContain(raw);expect(hashToken(raw)).toBe(hash);expect(hashToken(raw+"x")).not.toBe(hash)})});
