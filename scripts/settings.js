import { MODULE_ID } from "./main.js";

export function registerSettings() {
    const settings = {
        showWeaponsItems: {
            name: game.i18n.localize("enhancedcombathud-dnd5e.settings.showWeaponsItems.name"),
            hint: game.i18n.localize("enhancedcombathud-dnd5e.settings.showWeaponsItems.hint"),
            scope: "world",
            config: true,
            type: Boolean,
            default: false,
            onChange: (sett) => {
                ui.ARGON.constructor.DND5E.itemTypes.consumable = ui.ARGON.constructor.DND5E.itemTypes.consumable.filter(i => i !== "weapon");
                if(sett) ui.ARGON.constructor.DND5E.itemTypes.consumable.push("weapon");
                ui.ARGON.refresh()
            },
        },
        switchEquip: {
            name: game.i18n.localize("enhancedcombathud-dnd5e.settings.switchEquip.name"),
            hint: game.i18n.localize("enhancedcombathud-dnd5e.settings.switchEquip.hint"),
            scope: "world",
            config: true,
            type: Boolean,
            default: true,
            onChange: () => ui.ARGON.refresh(),
        },
        noAA: {
            name: game.i18n.localize("enhancedcombathud-dnd5e.settings.noAA.name"),
            hint: game.i18n.localize("enhancedcombathud-dnd5e.settings.noAA.hint"),
            scope: "world",
            config: true,
            type: Boolean,
            default: false,
            onChange: () => ui.ARGON.refresh(),
        },
    };

    registerSettingsArray(settings);
}

export function getSetting(key) {
    return game.settings.get(MODULE_ID, key);
}

export async function setSetting(key, value) {
    return await game.settings.set(MODULE_ID, key, value);
}

function registerSettingsArray(settings) {
    for(const [key, value] of Object.entries(settings)) {
        game.settings.register(MODULE_ID, key, value);
    }
}