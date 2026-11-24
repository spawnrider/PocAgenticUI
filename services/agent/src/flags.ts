import { initialize } from "unleash-client";
import { config } from "./config.js";

const unleash = initialize({ url: config.unleashUrl, appName: "agent", customHeaders: { Authorization: config.unleashToken } });
export const flag = (name: string, userId: string) => unleash.isEnabled(name, { userId });
export const whenReady = () => new Promise<void>((res) => (unleash.isSynchronized() ? res() : unleash.once("synchronized", () => res())));
