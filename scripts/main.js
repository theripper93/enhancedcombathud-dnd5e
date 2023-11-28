import {initConfig} from "./config.js";
import { registerSettings } from "./settings.js";

export const MODULE_ID = "enhancedcombathud-dnd5e";

Hooks.on("setup", () => {
    registerSettings();
    initConfig();
});