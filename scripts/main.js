import {initConfig} from "./echDnd5e.js";
import { registerSettings } from "./settings.js";
import "../scss/module.scss";

export const MODULE_ID = "enhancedcombathud-dnd5e";

Hooks.on("setup", () => {
    registerSettings();
    initConfig();
});