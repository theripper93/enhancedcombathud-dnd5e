import {initConfig} from "./config.js";
import { registerSettings } from "./settings.js";

export const MODULE_ID = "module-id";

Hooks.on("init", () => {
    initConfig();
    registerSettings();
    console.log("test2")
});