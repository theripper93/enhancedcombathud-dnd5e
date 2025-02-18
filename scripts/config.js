import { MODULE_ID } from "./main.js";

const ECHItems = {};

export function initConfig() {

    Hooks.on("updateItem", (item) => {
        if(item.parent === ui.ARGON._actor && ui.ARGON.rendered) ui.ARGON.components.portrait.refresh()
    })

    Hooks.on("argonInit", (CoreHUD) => {
        if (game.system.id !== "dnd5e") return;
        registerItems();
        const ARGON = CoreHUD.ARGON;

        class DND5eTooltip extends ARGON.CORE.Tooltip {
            get classes() {
                const original = super.classes;
                return original.concat(["dnd5e2"]);
            }
        }

        const isMIDI = game.modules.get("midi-qol")?.active;
        const getMidiFlag = (actionType) => {
            if (!isMIDI || !ui.ARGON._actor) return null;
            const flag = ui.ARGON._actor.getFlag("midi-qol", "actions") ?? {};
            const value = flag[actionType] ?? false;
            const midiAction = value ? 0 : 1;
            return midiAction;
        };

        const getActivationType = (item) => {
            if (!item?.system?.activities) {
                return;
            }
            return Array.from(item.system.activities)[0]?.activation?.type;
        };

        const getActionType = (item) => {
            if (!item?.system?.activities) {
                return;
            }
            return Array.from(item.system.activities)[0]?.actionType;
        };

        const actionTypes = {
            action: ["action"],
            bonus: ["bonus"],
            reaction: ["reaction", "reactiondamage", "reactionmanual"],
            free: ["special"],
        };

        const itemTypes = {
            spell: ["spell"],
            feat: ["feat"],
            consumable: ["consumable", "equipment", "loot"],
        };

        const mainBarFeatures = [];

        if (game.settings.get(MODULE_ID, "showWeaponsItems")) itemTypes.consumable.push("weapon");
        if (game.settings.get(MODULE_ID, "showClassActions")) mainBarFeatures.push("class");

        CoreHUD.DND5E = {
            actionTypes,
            itemTypes,
            mainBarFeatures,
            ECHItems,
        };

        Hooks.callAll("enhanced-combat-hud.dnd5e.initConfig", { actionTypes, itemTypes, ECHItems });

        async function getTooltipDetails(item, type) {
            let title, description, itemType, subtitle, target, range, dt;
            let damageTypes = [];
            let properties = [];
            let materialComponents = "";

            if (type == "skill") {
                title = CONFIG.DND5E.skills[item].label;
                description = game.i18n.localize(`enhancedcombathud-dnd5e.skills.${item}.tooltip`);
            } else if (type == "save") {
                title = CONFIG.DND5E.abilities[item].label;
                description = game.i18n.localize(`enhancedcombathud-dnd5e.abilities.${item}.tooltip`);
            } else {
                if (!item || !item.system) return;

                title = item.name;
                description = item.system.identified ? item.system.description.value : item.system.description.unidentified ?? item.system.description.value;
                itemType = item.type;
                target = item.labels?.target || "-";
                range = item.labels?.range || "-";
                properties = [];
                dt = item?.labels?.damages?.map(d => d.damageType);
                damageTypes = dt && dt.length ? dt : [];
                materialComponents = "";

                switch (itemType) {
                    case "weapon":
                        subtitle = CONFIG.DND5E.weaponTypes[item.system.weaponType];
                        properties.push(CONFIG.DND5E.itemActionTypes[getActionType(item)]);
                        for (let [key, value] of Object.entries(item.system.properties)) {
                            let prop = value && CONFIG.DND5E.weaponProperties[key] ? CONFIG.DND5E.weaponProperties[key] : undefined;
                            if (prop) properties.push(prop);
                        }
                        break;
                    case "spell":
                        subtitle = `${item.labels.level} ${item.labels.school}`;
                        properties.push(CONFIG.DND5E.spellSchools[item.system.school]);
                        properties.push(item.labels.duration);
                        properties.push(item.labels.save);
                        for (let comp of item.labels.components.all) {
                            properties.push(comp.abbr);
                        }
                        if (item.labels.materials) materialComponents = item.labels.materials;
                        break;
                    case "consumable":
                        subtitle = CONFIG.DND5E.consumableTypes[item.system.consumableType];
                        properties.push(CONFIG.DND5E.itemActionTypes[getActionType(item)]);
                        break;
                    case "feat":
                        subtitle = item.system.requirements;
                        properties.push(CONFIG.DND5E.itemActionTypes[getActionType(item)]);
                        break;
                }
            }

            if (description) description = await TextEditor.enrichHTML(description, { async: true, relativeTo: item.parent });
            let details = [];
            if (target || range) {
                details = [
                    {
                        label: "enhancedcombathud-dnd5e.tooltip.target.name",
                        value: target,
                    },
                    {
                        label: "enhancedcombathud-dnd5e.tooltip.range.name",
                        value: range,
                    },
                ];
            }
            if (item?.labels?.toHit) {
                details.push({
                    label: "enhancedcombathud-dnd5e.tooltip.toHit.name",
                    value: item.labels.toHit,
                });
            }
            if (item?.labels?.damages?.length) {
                let dmgString = "";
                item.labels.damages.forEach((dDmg) => {
                    dmgString += dDmg.formula + " " + getDamageTypeIcon(dDmg.damageType) + " ";
                });
                details.push({
                    label: "enhancedcombathud-dnd5e.tooltip.damage.name",
                    value: dmgString,
                });
            }

            const tooltipProperties = [];
            if (damageTypes?.length) damageTypes.forEach((d) => tooltipProperties.push({ label: d, primary: true }));
            if (properties?.length) properties.forEach((p) => tooltipProperties.push({ label: p?.label ?? p, secondary: true }));
            return { title, description, subtitle, details, properties: tooltipProperties, footerText: materialComponents };
        }

        function getDamageTypeIcon(damageType) {
            damageType ??= "";
            switch (damageType.toLowerCase()) {
                case "acid":
                    return '<i class="fas fa-flask"></i>';
                case "bludgeoning":
                    return '<i class="fas fa-hammer"></i>';
                case "cold":
                    return '<i class="fas fa-snowflake"></i>';
                case "fire":
                    return '<i class="fas fa-fire"></i>';
                case "force":
                    return '<i class="fas fa-hand-sparkles"></i>';
                case "lightning":
                    return '<i class="fas fa-bolt"></i>';
                case "necrotic":
                    return '<i class="fas fa-skull"></i>';
                case "piercing":
                    return '<i class="fas fa-crosshairs"></i>';
                case "poison":
                    return '<i class="fas fa-skull-crossbones"></i>';
                case "psychic":
                    return '<i class="fas fa-brain"></i>';
                case "radiant":
                    return '<i class="fas fa-sun"></i>';
                case "slashing":
                    return '<i class="fas fa-cut"></i>';
                case "thunder":
                    return '<i class="fas fa-bell"></i>';
                case "healing":
                    return '<i class="fas fa-heart"></i>';
                default:
                    return '<i class="fas fa-sparkles"></i>';
            }
        }

        function getProficiencyIcon(proficiency) {
            if (proficiency == 0) return '<i style="margin-right: 1ch; pointer-events: none" class="far fa-circle"> </i>';
            else if (proficiency == 1) return '<i style="margin-right: 1ch; pointer-events: none" class="fas fa-check"> </i>';
            else if (proficiency == 2) return '<i style="margin-right: 1ch; pointer-events: none" class="fas fa-check-double"> </i>';
            else if (proficiency == 0.5) return '<i style="margin-right: 1ch; pointer-events: none" class="fas fa-adjust"> </i>';
            else return '<i style="margin-right: 1ch; pointer-events: none" class="far fa-circle"> </i>';
        }

        function condenseItemButtons(items) {
            const condenseClassActions = game.settings.get(MODULE_ID, "condenseClassActions");
            if (!condenseClassActions) return items.map((item) => new DND5eItemButton({ item, inActionPanel: true }));
            const condensedItems = [];
            const barItemsLength = items.length;
            const barItemsMultipleOfTwo = barItemsLength - (barItemsLength % 2);
            let currentSplitButtonItemButton = null;
            for (let i = 0; i < barItemsLength; i++) {
                const isCondensedButton = i < barItemsMultipleOfTwo;
                const item = items[i];
                if (isCondensedButton) {
                    if (currentSplitButtonItemButton) {
                        const button = new DND5eItemButton({ item, inActionPanel: false });
                        condensedItems.push(new ARGON.MAIN.BUTTONS.SplitButton(currentSplitButtonItemButton, button));
                        currentSplitButtonItemButton = null;
                    } else {
                        currentSplitButtonItemButton = new DND5eItemButton({ item, inActionPanel: false });
                    }
                } else {
                    condensedItems.push(new DND5eItemButton({ item, inActionPanel: true }));
                }
            }
            return condensedItems;
        }

        class DND5ePortraitPanel extends ARGON.PORTRAIT.PortraitPanel {
            constructor(...args) {
                super(...args);
            }

            get description() {
                const { type, system } = this.actor;
                const actor = this.actor;
                const isNPC = type === "npc";
                const isPC = type === "character";
                if (isNPC) {
                    const creatureType = game.i18n.localize(CONFIG.DND5E.creatureTypes[actor.system.details.type.value]?.label ?? actor.system.details.type.custom);
                    const cr = system.details.cr >= 1 || system.details.cr <= 0 ? system.details.cr : `1/${1 / system.details.cr}`;
                    return `CR ${cr} ${creatureType}`;
                } else if (isPC) {
                    const classes = Object.values(actor.classes)
                        .map((c) => c.name)
                        .join(" / ");
                    return `Level ${system.details.level} ${classes} (${system.details.race})`;
                } else {
                    return "";
                }
            }

            get isDead() {
                return this.isDying && this.actor.type !== "character";
            }

            get isDying() {
                return this.actor.system.attributes.hp.value <= 0;
            }

            get successes() {
                return this.actor.system.attributes?.death?.success ?? 0;
            }

            get failures() {
                return this.actor.system.attributes?.death?.failure ?? 0;
            }

            get configurationTemplate() {
                return "modules/enhancedcombathud-dnd5e/templates/argon-actor-config.hbs";
            }

            async _onDeathSave(event) {
                this.actor.rollDeathSave({});
            }

            async getStatBlocks() {
                const HPText = game.i18n
                    .localize("DND5E.HitPoints")
                    .split(" ")
                    .map((word) => word.charAt(0).toUpperCase())
                    .join("");
                const ACText = game.i18n
                    .localize("DND5E.ArmorClass")
                    .split(" ")
                    .map((word) => word.charAt(0).toUpperCase())
                    .join("");
                const SpellDC = game.i18n.localize("DND5E.SaveDC").replace("{ability}", "").replace("{dc}", "").trim();

                const hpColor = this.actor.system.attributes.hp.temp ? "#6698f3" : "rgb(0 255 170)";
                const tempMax = this.actor.system.attributes.hp.tempmax;
                const hpMaxColor = tempMax ? (tempMax > 0 ? "rgb(222 91 255)" : "#ffb000") : "rgb(255 255 255)";

                return [
                    [
                        {
                            text: `${this.actor.system.attributes.hp.value + (this.actor.system.attributes.hp.temp ?? 0)}`,
                            color: hpColor,
                        },
                        {
                            text: `/`,
                        },
                        {
                            text: `${this.actor.system.attributes.hp.max + (this.actor.system.attributes.hp.tempmax ?? 0)}`,
                            color: hpMaxColor,
                        },
                        {
                            text: HPText,
                        },
                    ],
                    [
                        {
                            text: ACText,
                        },
                        {
                            text: this.actor.system.attributes.ac.value,
                            color: "var(--ech-movement-baseMovement-background)",
                        },
                    ],
                    [
                        {
                            text: SpellDC,
                        },
                        {
                            text: this.actor.system.attributes.spell.dc,
                            color: "var(--ech-movement-baseMovement-background)",
                        },
                    ],
                ];
            }
        }

        class DND5eDrawerButton extends ARGON.DRAWER.DrawerButton {
            constructor(buttons, item, type) {
                super(buttons);
                this.item = item;
                this.type = type;
            }

            get hasTooltip() {
                return true;
            }

            get tooltipOrientation() {
                return TooltipManager.TOOLTIP_DIRECTIONS.RIGHT;
            }

            async getTooltipData() {
                const tooltipData = await getTooltipDetails(this.item, this.type);
                return tooltipData;
            }
        }

        class DND5eDrawerPanel extends ARGON.DRAWER.DrawerPanel {
            constructor(...args) {
                super(...args);
            }

            get categories() {
                const abilities = this.actor.system.abilities;
                const skills = this.actor.system.skills;
                const tools = this.actor.itemTypes.tool;

                const addSign = (value) => {
                    if (value >= 0) return `+${value}`;
                    return value;
                };

                const abilitiesButtons = Object.keys(abilities).map((ability) => {
                    const abilityData = abilities[ability];
                    return new DND5eDrawerButton(
                        [
                            {
                                label: CONFIG.DND5E.abilities[ability].label,
                                onClick: (event) => this.actor.rollAbilityCheck({ ability, event }),
                            },
                            {
                                label: addSign(abilityData.mod + (abilityData.checkBonus || 0)),
                                onClick: (event) => this.actor.rollAbilityCheck({ ability, event }),
                            },
                            {
                                label: addSign(abilityData.save.value),
                                onClick: (event) => this.actor.rollSavingThrow({ ability, event }),
                            },
                        ],
                        ability,
                        "save",
                    );
                });

                const skillsButtons = Object.keys(skills).map((skill) => {
                    const skillData = skills[skill];
                    return new DND5eDrawerButton(
                        [
                            {
                                label: getProficiencyIcon(skillData.proficient) + CONFIG.DND5E.skills[skill].label,
                                onClick: (event) => this.actor.rollSkill({ skill, event }),
                            },
                            {
                                label: `${addSign(skillData.total)}<span style="margin: 0 1rem; filter: brightness(0.8)">(${skillData.passive})</span>`,
                                style: "display: flex; justify-content: flex-end;",
                            },
                        ],
                        skill,
                        "skill",
                    );
                });

                const toolButtons = tools.map((tool) => {
                    return new DND5eDrawerButton(
                        [
                            {
                                label: getProficiencyIcon(tool.system.proficient) + tool.name,
                                onClick: (event) => tool.rollToolCheck({ event }),
                            },
                            {
                                label: addSign(abilities[tool.abilityMod].mod + tool.system.proficiencyMultiplier * this.actor.system.attributes.prof),
                            },
                        ],
                        tool,
                    );
                });

                return [
                    {
                        gridCols: "5fr 2fr 2fr",
                        captions: [
                            {
                                label: "Abilities",
                                align: "left",
                            },
                            {
                                label: "Check",
                                align: "center",
                            },
                            {
                                label: "Save",
                                align: "center",
                            },
                        ],
                        align: ["left", "center", "center"],
                        buttons: abilitiesButtons,
                    },
                    {
                        gridCols: "7fr 2fr",
                        captions: [
                            {
                                label: "Skills",
                            },
                            {
                                label: "",
                            },
                        ],
                        buttons: skillsButtons,
                    },
                    {
                        gridCols: "7fr 2fr",
                        captions: [
                            {
                                label: "Tools",
                            },
                            {
                                label: "",
                            },
                        ],
                        buttons: toolButtons,
                    },
                ];
            }

            get title() {
                return `${game.i18n.localize("enhancedcombathud-dnd5e.hud.saves.name")} / ${game.i18n.localize("enhancedcombathud-dnd5e.hud.skills.name")} / ${game.i18n.localize("enhancedcombathud-dnd5e.hud.tools.name")}`;
            }
        }

        class DND5eActionActionPanel extends ARGON.MAIN.ActionPanel {
            constructor(...args) {
                super(...args);
            }

            get label() {
                return "DND5E.Action";
            }

            get maxActions() {
                return this.actor?.inCombat ? 1 : null;
            }

            get currentActions() {
                return getMidiFlag("action") ?? (this.isActionUsed ? 0 : 1);
            }

            _onNewRound(combat) {
                this.isActionUsed = false;
                this.updateActionUse();
            }

            async _getButtons() {
                const spellItems = this.actor.items.filter((item) => itemTypes.spell.includes(item.type) && actionTypes.action.includes(getActivationType(item)) && !CoreHUD.DND5E.mainBarFeatures.includes(item.system.type?.value));
                const featItems = this.actor.items.filter((item) => itemTypes.feat.includes(item.type) && actionTypes.action.includes(getActivationType(item)) && !CoreHUD.DND5E.mainBarFeatures.includes(item.system.type?.value));
                const consumableItems = this.actor.items.filter((item) => itemTypes.consumable.includes(item.type) && actionTypes.action.includes(getActivationType(item)) && !CoreHUD.DND5E.mainBarFeatures.includes(item.system.type?.value));

                const spellButton = !spellItems.length ? [] : [new DND5eButtonPanelButton({ type: "spell", items: spellItems, color: 0 })].filter((button) => button.hasContents);

                const specialActions = Object.values(ECHItems);

                const showSpecialActions = game.settings.get(MODULE_ID, "showSpecialActions");
                const buttons = [];
                if (showSpecialActions) {
                    buttons.push(...[new DND5eItemButton({ item: null, isWeaponSet: true, isPrimary: true }), new ARGON.MAIN.BUTTONS.SplitButton(new DND5eSpecialActionButton(specialActions[0]), new DND5eSpecialActionButton(specialActions[1])), ...spellButton, new DND5eButtonPanelButton({ type: "feat", items: featItems, color: 0 }), new ARGON.MAIN.BUTTONS.SplitButton(new DND5eSpecialActionButton(specialActions[2]), new DND5eSpecialActionButton(specialActions[3])), new ARGON.MAIN.BUTTONS.SplitButton(new DND5eSpecialActionButton(specialActions[4]), new DND5eSpecialActionButton(specialActions[5])), new DND5eButtonPanelButton({ type: "consumable", items: consumableItems, color: 0 })]);
                } else {
                    buttons.push(...[new DND5eItemButton({ item: null, isWeaponSet: true, isPrimary: true }), ...spellButton, new DND5eButtonPanelButton({ type: "feat", items: featItems, color: 0 }), new DND5eButtonPanelButton({ type: "consumable", items: consumableItems, color: 0 })]);
                }

                const barItems = this.actor.items.filter((item) => CoreHUD.DND5E.mainBarFeatures.includes(item.system.type?.value) && actionTypes.action.includes(getActivationType(item)));
                buttons.push(...condenseItemButtons(barItems));

                return buttons.filter((button) => button.hasContents || button.items == undefined || button.items.length);
            }
        }

        class DND5eBonusActionPanel extends ARGON.MAIN.ActionPanel {
            constructor(...args) {
                super(...args);
            }

            get label() {
                return "DND5E.BonusAction";
            }

            get maxActions() {
                return this.actor?.inCombat ? 1 : null;
            }

            get currentActions() {
                return getMidiFlag("bonus") ?? (this.isActionUsed ? 0 : 1);
            }

            _onNewRound(combat) {
                this.isActionUsed = false;
                this.updateActionUse();
            }

            async _getButtons() {
                const buttons = [new DND5eItemButton({ item: null, isWeaponSet: true, isPrimary: false })];
                for (const [type, types] of Object.entries(itemTypes)) {
                    const items = this.actor.items.filter((item) => types.includes(item.type) && actionTypes.bonus.includes(getActivationType(item)) && !CoreHUD.DND5E.mainBarFeatures.includes(item.system.type?.value));
                    if (!items.length) continue;
                    const button = new DND5eButtonPanelButton({ type, items, color: 1 });
                    if (button.hasContents) buttons.push(button);
                }

                const barItems = this.actor.items.filter((item) => CoreHUD.DND5E.mainBarFeatures.includes(item.system.type?.value) && actionTypes.bonus.includes(getActivationType(item)));
                buttons.push(...condenseItemButtons(barItems));

                return buttons;
            }
        }

        class DND5eReactionActionPanel extends ARGON.MAIN.ActionPanel {
            constructor(...args) {
                super(...args);
            }

            get label() {
                return "DND5E.Reaction";
            }

            get maxActions() {
                return this.actor?.inCombat ? 1 : null;
            }

            get currentActions() {
                return getMidiFlag("reaction") ?? (this.isActionUsed ? 0 : 1);
            }

            _onNewRound(combat) {
                this.isActionUsed = false;
                this.updateActionUse();
            }

            async _getButtons() {
                const buttons = [new DND5eItemButton({ item: null, isWeaponSet: true, isPrimary: true })];
                //buttons.push(new DND5eEquipmentButton({slot: 1}));
                for (const [type, types] of Object.entries(itemTypes)) {
                    const items = this.actor.items.filter((item) => types.includes(item.type) && actionTypes.reaction.includes(getActivationType(item)) && !CoreHUD.DND5E.mainBarFeatures.includes(item.system.type?.value));
                    if (!items.length) continue;
                    const button = new DND5eButtonPanelButton({ type, items, color: 3 });
                    if (button.hasContents) buttons.push(button);
                }

                const barItems = this.actor.items.filter((item) => CoreHUD.DND5E.mainBarFeatures.includes(item.system.type?.value) && actionTypes.reaction.includes(getActivationType(item)));
                buttons.push(...condenseItemButtons(barItems));

                return buttons;
            }
        }

        class DND5eFreeActionPanel extends ARGON.MAIN.ActionPanel {
            constructor(...args) {
                super(...args);
            }

            get label() {
                return "DND5E.Special";
            }

            get maxActions() {
                return this.actor?.inCombat ? 1 : null;
            }

            get currentActions() {
                return this.isActionUsed ? 0 : 1;
            }

            _onNewRound(combat) {
                this.isActionUsed = false;
                this.updateActionUse();
            }

            async _getButtons() {
                const buttons = [];

                for (const [type, types] of Object.entries(itemTypes)) {
                    const items = this.actor.items.filter((item) => types.includes(item.type) && actionTypes.free.includes(getActivationType(item)) && !CoreHUD.DND5E.mainBarFeatures.includes(item.system.type?.value));
                    if (!items.length) continue;
                    const button = new DND5eButtonPanelButton({ type, items, color: 2 });
                    if (button.hasContents) buttons.push(button);
                }

                const barItems = this.actor.items.filter((item) => CoreHUD.DND5E.mainBarFeatures.includes(item.system.type?.value) && actionTypes.free.includes(getActivationType(item)));
                buttons.push(...condenseItemButtons(barItems));

                return buttons;
            }
        }

        class DND5eLegActionPanel extends ARGON.MAIN.ActionPanel {
            constructor(...args) {
                super(...args);
            }

            get label() {
                return "DND5E.LegendaryActionLabel";
            }

            get maxActions() {
                return this.actor?.inCombat ? this.actor.system.resources?.legact?.max ?? null : null;
            }

            get currentActions() {
                return this.actor.system.resources?.legact?.value ?? null;
            }

            async _getButtons() {
                const buttons = [];
                const legendary = this.actor.items.filter((item) => getActivationType(item) === "legendary");
                legendary.forEach((item) => {
                    buttons.push(new DND5eItemButton({ item, inActionPanel: true }));
                });
                return buttons;
            }
        }

        class DND5eLairActionPanel extends ARGON.MAIN.ActionPanel {
            constructor(...args) {
                super(...args);
            }

            get label() {
                return "DND5E.LairActionLabel";
            }

            get maxActions() {
                return this.actor?.inCombat ? 1 : null;
            }

            get currentActions() {
                return this.actor.system.resources.lair?.value * 1;
            }

            async _getButtons() {
                const buttons = [];
                const lair = this.actor.items.filter((item) => getActivationType(item) === "lair");
                lair.forEach((item) => {
                    buttons.push(new DND5eItemButton({ item, inActionPanel: true }));
                });
                return buttons;
            }
        }

        class DND5eMythicActionPanel extends ARGON.MAIN.ActionPanel {
            constructor(...args) {
                super(...args);
            }

            get label() {
                return "DND5E.MythicActionLabel";
            }

            get maxActions() {
                return null; //this.actor?.inCombat ? 1 : null;
            }

            get currentActions() {
                return null; //this.actor.system.resources.mythic?.value * 1;
            }

            async _getButtons() {
                const buttons = [];
                const mythic = this.actor.items.filter((item) => getActivationType(item) === "mythic");
                mythic.forEach((item) => {
                    buttons.push(new DND5eItemButton({ item, inActionPanel: true }));
                });
                return buttons;
            }
        }

        class DND5eItemButton extends ARGON.MAIN.BUTTONS.ItemButton {
            constructor(...args) {
                super(...args);
            }

            get activity() {
                if (!this.item?.system?.activities) {
                    return;
                }
                return Array.from(this.item.system.activities)[0];
            }

            get hasTooltip() {
                return true;
            }

            get ranges() {
                const item = this.activity;
                const touchRange = item.range.units == "touch" ? canvas?.scene?.grid?.distance : null;
                return {
                    normal: item?.range?.value ?? touchRange,
                    long: item?.range?.long ?? null,
                };
            }

            get targets() {
                const item = this.activity;
                const validTargets = ["creature", "ally", "enemy"];
                const actionType = item.actionType;
                const affects = item.target?.affects ?? {};
                const targetType = affects.type;
                if (!item.target?.template?.units && validTargets.includes(targetType)) {
                    return affects.count ?? 1;
                } else if (validTargets.includes(targetType) && affects.count) {
                    return affects.count;
                } else if (actionType === "mwak" || actionType === "rwak" || actionType === "msak" || actionType === "rsak") {
                    return affects.count || 1;
                }
                return null;
            }

            get visible() {
                if (!this._isWeaponSet) return super.visible;
                const isReaction = this.parent instanceof DND5eReactionActionPanel;
                const isMelee = this.activity?.actionType === "mwak";
                if (isReaction && !isMelee) return false;
                if (this._isPrimary) return super.visible;
                if (this.activity?.type?.value === "shield") return false;
                return super.visible;
            }

            async getTooltipData() {
                const tooltipData = await getTooltipDetails(this.item);
                tooltipData.propertiesLabel = "enhancedcombathud-dnd5e.tooltip.properties.name";
                return tooltipData;
            }

            async _onLeftClick(event) {
                ui.ARGON.interceptNextDialog(event.currentTarget);
                const used = await this.item.use({event, legacy: false}, {event});
                if (used) {
                    DND5eItemButton.consumeActionEconomy(this.activity);
                    const useOtherItem = this.activity?.consumption?.targets?.find(t => t.type === "itemUses");
                    if (useOtherItem) {
                        const otherItem = this.actor.items.get(useOtherItem.target);
                        const allConnectedItems = this.actor.items.filter(i => i.system.activities?.find(a => a.consumption?.targets?.find(t => t.type === "itemUses" && t.target === otherItem.id)));
                        ui.ARGON.updateItemButtons(allConnectedItems);
                    }
                    this.render(true)
                }
            }

            async _onRightClick(event) {
                this.activity?.sheet?.render(true);
            }

            static consumeActionEconomy(activity) {
                const activationType = activity?.activation?.type;
                let actionType = null;
                for (const [type, types] of Object.entries(actionTypes)) {
                    if (types.includes(activationType)) actionType = type;
                }
                if (!actionType) return;
                if (game.combat?.combatant?.actor !== activity.item.parent) actionType = "reaction";
                if (actionType === "action") {
                    ui.ARGON.components.main[0].isActionUsed = true;
                    ui.ARGON.components.main[0].updateActionUse();
                } else if (actionType === "bonus") {
                    ui.ARGON.components.main[1].isActionUsed = true;
                    ui.ARGON.components.main[1].updateActionUse();
                } else if (actionType === "reaction") {
                    ui.ARGON.components.main[2].isActionUsed = true;
                    ui.ARGON.components.main[2].updateActionUse();
                } else if (actionType === "free") {
                    ui.ARGON.components.main[3].isActionUsed = true;
                    ui.ARGON.components.main[3].updateActionUse();
                } else if (actionType === "legendary") {
                    ui.ARGON.components.main[4].isActionUsed = true;
                }
            }

            async render(...args) {
                await super.render(...args);
                if (this.activity) {
                    const weapons = this.actor.items.filter((item) => item.consume?.target === this.activity.id);
                    ui.ARGON.updateItemButtons(weapons);
                }
            }

            get quantity() {
                if (this.item.system.uses?.max) return this.item.system.uses.max - this.item.system.uses.spent;
                if (!this.activity) return null;
                const showQuantityItemTypes = ["consumable"];
                const consumeType = this.activity?.consume?.type;
                const useAmmo = this.item.system.ammunition?.type;
                const useOtherItem = this.activity?.consumption?.targets?.find(t => t.type === "itemUses");
                if (useOtherItem) {
                    const otherItem = this.actor.items.get(useOtherItem.target);
                    if (otherItem && otherItem.system.uses?.max) {
                        return otherItem.system.uses.max - otherItem.system.uses.spent;
                    }
                }
                if (useAmmo) {
                    const ammoItem = this.item.system.ammunitionOptions[0]?.item;
                    if (!ammoItem) return null;
                    return Math.floor(ammoItem.system.quantity ?? 0);
                } else if (consumeType === "attribute") {
                    return Math.floor(getProperty(this.actor, this.activity.consume.target) / this.activity.consume.amount);
                } else if (consumeType === "charges") {
                    const chargesItem = this.actor.items.get(this.activity.consume.target);
                    if (!chargesItem) return null;
                    return Math.floor((chargesItem.uses?.value ?? 0) / this.activity.consume.amount);
                } else if (showQuantityItemTypes.includes(this.item.type) && !this.activity.uses.max) {
                    return this.item.system.quantity;
                } else if (this.activity.uses.value !== null && this.activity.uses.per !== null && this.activity.uses.max) {
                    return this.activity.uses.value;
                }
                return null;
            }
        }

        class DND5eButtonPanelButton extends ARGON.MAIN.BUTTONS.ButtonPanelButton {
            constructor({ type, items, color }) {
                super();
                this.type = type;
                this.items = items;
                this.color = color;
                this.itemsWithSpells = [];
                this._spells = this.prePrepareSpells();
            }

            get hasContents() {
                return this._spells ? !!this._spells.length || !!this.itemsWithSpells.length : !!this.items.length;
            }

            get colorScheme() {
                return this.color;
            }

            get id() {
                return `${this.type}-${this.color}`;
            }

            get label() {
                switch (this.type) {
                    case "spell":
                        return "enhancedcombathud-dnd5e.hud.castspell.name";
                    case "feat":
                        return "enhancedcombathud-dnd5e.hud.usepower.name";
                    case "consumable":
                        return "enhancedcombathud-dnd5e.hud.useitem.name";
                }
            }

            get icon() {
                switch (this.type) {
                    case "spell":
                        return "modules/enhancedcombathud/icons/spell-book.webp";
                    case "feat":
                        return "modules/enhancedcombathud/icons/mighty-force.webp";
                    case "consumable":
                        return "modules/enhancedcombathud/icons/drink-me.webp";
                }
            }

            get showPreparedOnly() {
                if (this.actor.type !== "character") return false;
                const preparedFlag = this.actor.getFlag(MODULE_ID, "showPrepared");
                if (preparedFlag === "all") return false;
                if (preparedFlag === "preparedOnly") return true;
                const classes = Object.keys(this.actor.classes);
                const requiresPreparation = ["cleric", "druid", "paladin", "wizard", "artificer"].some((className) => classes.includes(className));
                return requiresPreparation;
            }

            prePrepareSpells() {
                if (this.type !== "spell") return;

                const spellLevels = CONFIG.DND5E.spellLevels;
                const itemsToIgnore = [];
                if (game.modules.get("items-with-spells-5e")?.active) {
                    const IWSAPI = game.modules.get("items-with-spells-5e").api;
                    const actionType = this.items[0].system.activation?.type;
                    const spellItems = this.actor.items.filter((item) => item.flags["items-with-spells-5e"]?.["item-spells"]?.length);
                    for (const item of spellItems) {
                        const spellData = item.flags["items-with-spells-5e"]["item-spells"];
                        const itemsInSpell = spellData.map((spell) => this.actor.items.get(spell.id)).filter((item) => item && getActivationType(item) === actionType);
                        if (!itemsInSpell.length) continue;
                        itemsToIgnore.push(...itemsInSpell);
                        if (!IWSAPI.isUsableItem(item)) continue;
                        this.itemsWithSpells.push({
                            label: item.name,
                            buttons: itemsInSpell.map((item) => new DND5eItemButton({ item })),
                            uses: () => {
                                return { max: item.system.uses?.max, value: item.system.uses?.value };
                            },
                        });
                    }
                    this.items = this.items.filter((item) => !itemsToIgnore.includes(item));
                }
                const magicItemsSpells = this.items.filter((item) => item.flags.dnd5e?.cachedFor?.includes("Activity"));
                const magicItems = magicItemsSpells.map((item) => ({ spell: item, item: this.actor.items.get(item.flags.dnd5e.cachedFor.split(".Activity.")[0].replace(".Item.", "")) }));
                const magicItemsMap = new Map();
                magicItems.forEach((item) => {
                    const current = magicItemsMap.get(item.item);
                    if (current) {
                        current.push(item.spell);
                    } else {
                        magicItemsMap.set(item.item, [item.spell]);
                    }
                });
                for (const [item, spells] of magicItemsMap) {
                    const requiresAttunement = item.system.attunement === "required";
                    const isAttuned = item.system.attuned;
                    itemsToIgnore.push(...spells);

                    if (requiresAttunement && !isAttuned) continue;

                    this.itemsWithSpells.push({
                        label: item.name,
                        buttons: spells.map((spell) => new DND5eItemButton({ item: spell })),
                        uses: () => {
                            return { max: item.system.uses?.max, value: item.system.uses?.value };
                        },
                    });
                }
                if (magicItems.length) this.items = this.items.filter((item) => !itemsToIgnore.includes(item));
                if (this.showPreparedOnly) {
                    const allowIfNotPrepared = ["atwill", "innate", "pact", "always"];
                    this.items = this.items.filter((item) => {
                        if (allowIfNotPrepared.includes(item.system.preparation.mode)) return true;
                        if (item.system.level == 0) return true;
                        return item.system.preparation.prepared;
                    });
                }

                const spells = [
                    ...this.itemsWithSpells,
                    {
                        label: "DND5E.SpellPrepAtWill",
                        buttons: this.items.filter((item) => item.system.preparation.mode === "atwill").map((item) => new DND5eItemButton({ item })),
                        uses: { max: Infinity, value: Infinity },
                    },
                    {
                        label: "DND5E.SpellPrepInnate",
                        buttons: this.items.filter((item) => item.system.preparation.mode === "innate").map((item) => new DND5eItemButton({ item })),
                        uses: { max: Infinity, value: Infinity },
                    },
                    {
                        label: Object.values(spellLevels)[0],
                        buttons: this.items.filter((item) => item.system.level == 0).map((item) => new DND5eItemButton({ item })),
                        uses: { max: Infinity, value: Infinity },
                    },
                    {
                        label: "DND5E.PactMagic",
                        buttons: this.items.filter((item) => item.system.preparation.mode === "pact").map((item) => new DND5eItemButton({ item })),
                        uses: () => {
                            return this.actor.system.spells.pact;
                        },
                    },
                ];
                for (const [level, label] of Object.entries(spellLevels)) {
                    const levelSpells = this.items.filter((item) => item.system.level == level && (item.system.preparation.mode === "prepared" || item.system.preparation.mode === "always"));
                    if (!levelSpells.length || level == 0) continue;
                    spells.push({
                        label,
                        buttons: levelSpells.map((item) => new DND5eItemButton({ item })),
                        uses: () => {
                            return this.actor.system.spells[`spell${level}`];
                        },
                    });
                }
                return spells.filter((spell) => spell.buttons.length);
            }

            async _getPanel() {
                if (this.type === "spell") {
                    return new ARGON.MAIN.BUTTON_PANELS.ACCORDION.AccordionPanel({ id: this.id, accordionPanelCategories: this._spells.map(({ label, buttons, uses }) => new ARGON.MAIN.BUTTON_PANELS.ACCORDION.AccordionPanelCategory({ label, buttons, uses })) });
                } else {
                    return new ARGON.MAIN.BUTTON_PANELS.ButtonPanel({ id: this.id, buttons: this.items.map((item) => new DND5eItemButton({ item })) });
                }
            }
        }

        class DND5eSpecialActionButton extends ARGON.MAIN.BUTTONS.ActionButton {
            constructor(specialItem) {
                super();
                const actorItem = this.actor.items.getName(specialItem.name);
                this.actorItem = actorItem;
                this.item =
                    actorItem ??
                    new CONFIG.Item.documentClass(specialItem, {
                        parent: this.actor,
                    });
            }

            get label() {
                return this.item.name;
            }

            get icon() {
                return this.item.img;
            }

            get hasTooltip() {
                return true;
            }

            get activity() {
                if (!this.item?.system?.activities) {
                    return;
                }
                return Array.from(this.item.system.activities)[0];
            }

            async getTooltipData() {
                const tooltipData = await getTooltipDetails(this.item);
                tooltipData.propertiesLabel = "enhancedcombathud-dnd5e.tooltip.properties.name";
                return tooltipData;
            }

            async _onLeftClick(event) {
                const useCE = game.modules.get("dfreds-convenient-effects")?.active && game.dfreds.effectInterface.findEffect({ effectName: this.label });
                let success = false;
                if (useCE) {
                    success = true;
                    await game.dfreds.effectInterface.toggleEffect({ effectName: this.label, overlay: false, uuids: [this.actor.uuid] });
                } else {
                    success = this.actorItem ? await this.activity.use({ event }, { event }) : await this.createChatMessage();
                }
                if (success) {
                    DND5eItemButton.consumeActionEconomy(this.item);
                }
            }

            async createChatMessage() {
                return await ChatMessage.create({
                    user: game.user,
                    speaker: {
                        actor: this.actor,
                        token: this.actor.token,
                        alias: this.actor.name,
                    },
                    content: `
                    <div class="dnd5e2 chat-card item-card" data-display-challenge="">

    <section class="card-header description collapsible">

        <header class="summary">
            <img class="gold-icon" src="${this.icon}">
            <div class="name-stacked border">
                <span class="title">${this.label}</span>
                <span class="subtitle">
                    Feature
                </span>
            </div>
            <i class="fas fa-chevron-down fa-fw"></i>
        </header>

        <section class="details collapsible-content card-content">
            <div class="wrapper">
                ${this.item.system.description.value}
            </div>
        </section>
    </section>


</div>
                    `,
                });
            }
        }

        class DND5eMovementHud extends ARGON.MovementHud {
            constructor(...args) {
                super(...args);
                this.getMovementMode = game.modules.get("elevation-drag-ruler")?.api?.getMovementMode;
            }

            get visible() {
                return game.combat?.started;
            }

            get movementMode() {
                return this.getMovementMode ? this.getMovementMode(this.token) : "walk";
            }

            get movementMax() {
                if (!this.actor) return 0;
                return this.actor.system.attributes.movement[this.movementMode] / canvas.scene.dimensions.distance;
            }
        }

        class DND5eButtonHud extends ARGON.ButtonHud {
            constructor(...args) {
                super(...args);
            }

            get visible() {
                return !game.combat?.started;
            }

            async _getButtons() {
                return [
                    {
                        label: "DND5E.REST.Long.Label",
                        onClick: (event) => this.actor.longRest(),
                        icon: "fas fa-bed",
                    },
                    {
                        label: "DND5E.REST.Short.Label",
                        onClick: (event) => this.actor.shortRest(),
                        icon: "fas fa-coffee",
                    },
                ];
            }
        }

        class DND5eWeaponSets extends ARGON.WeaponSets {
            async getDefaultSets() {
                const sets = await super.getDefaultSets();
                const isTransformed = this.actor.flags?.dnd5e?.isPolymorphed;
                if (this.actor.type !== "npc" && !isTransformed) return sets;
                const actions = this.actor.items.filter((item) => item.type === "weapon" && getActivationType(item) === "action");
                const bonus = this.actor.items.filter((item) => item.type === "weapon" && getActivationType(item) === "bonus");
                return {
                    1: {
                        primary: actions[0]?.uuid ?? null,
                        secondary: bonus[0]?.uuid ?? null,
                    },
                    2: {
                        primary: actions[1]?.uuid ?? null,
                        secondary: bonus[1]?.uuid ?? null,
                    },
                    3: {
                        primary: actions[2]?.uuid ?? null,
                        secondary: bonus[2]?.uuid ?? null,
                    },
                };
            }

            async _getSets() {
                const isTransformed = this.actor.flags?.dnd5e?.isPolymorphed;

                const sets = isTransformed ? await this.getDefaultSets() : foundry.utils.mergeObject(await this.getDefaultSets(), foundry.utils.deepClone(this.actor.getFlag("enhancedcombathud", "weaponSets") || {}));

                for (const [set, slots] of Object.entries(sets)) {
                    slots.primary = slots.primary ? await fromUuid(slots.primary) : null;
                    slots.secondary = slots.secondary ? await fromUuid(slots.secondary) : null;
                }
                return sets;
            }

            async _onSetChange({ sets, active }) {
                const switchEquip = game.settings.get("enhancedcombathud-dnd5e", "switchEquip");
                if (!switchEquip) return;
                const updates = [];
                const activeSet = sets[active];
                const activeItems = Object.values(activeSet).filter((item) => item);
                const inactiveSets = Object.values(sets).filter((set) => set !== activeSet);
                const inactiveItems = inactiveSets
                    .flatMap((set) => Object.values(set))
                    .filter((item) => item)
                    .filter((item) => !activeItems.includes(item));
                activeItems.forEach((item) => {
                    if (!item.system?.equipped) updates.push({ _id: item.id, "system.equipped": true });
                });
                inactiveItems.forEach((item) => {
                    if (item.system?.equipped) updates.push({ _id: item.id, "system.equipped": false });
                });
                return await this.actor.updateEmbeddedDocuments("Item", updates);
            }
        }

        const enableMacroPanel = game.settings.get(MODULE_ID, "macroPanel");

        const mainPanels = [DND5eActionActionPanel, DND5eBonusActionPanel, DND5eReactionActionPanel, DND5eFreeActionPanel, DND5eLegActionPanel, DND5eLairActionPanel, DND5eMythicActionPanel];
        if (enableMacroPanel) mainPanels.push(ARGON.PREFAB.MacroPanel);
        mainPanels.push(ARGON.PREFAB.PassTurnPanel);

        CoreHUD.definePortraitPanel(DND5ePortraitPanel);
        CoreHUD.defineDrawerPanel(DND5eDrawerPanel);
        CoreHUD.defineMainPanels(mainPanels);
        CoreHUD.defineMovementHud(DND5eMovementHud);
        CoreHUD.defineButtonHud(DND5eButtonHud);
        CoreHUD.defineWeaponSets(DND5eWeaponSets);
        CoreHUD.defineTooltip(DND5eTooltip);
        CoreHUD.defineSupportedActorTypes(["character", "npc"]);
    });
}

function registerItems() {
    ECHItems[game.i18n.localize("enhancedcombathud-dnd5e.items.disengage.name")] = {
        name: game.i18n.localize("enhancedcombathud-dnd5e.items.disengage.name"),
        type: "feat",
        img: "modules/enhancedcombathud/icons/journey.webp",
        system: {
            type: {
                value: "",
                subtype: "",
            },
            description: {
                value: game.i18n.localize("enhancedcombathud-dnd5e.items.disengage.desc"),
                chat: "",
                unidentified: "",
            },
            source: "",
            quantity: 1,
            weight: 0,
            price: 0,
            attuned: false,
            attunement: 0,
            equipped: false,
            rarity: "",
            identified: true,
            activation: {
                type: "action",
                cost: 1,
                condition: "",
            },
            duration: {
                value: 1,
                units: "turn",
            },
            target: {
                value: null,
                width: null,
                units: "",
                type: "self",
            },
            range: {
                value: null,
                long: null,
                units: "",
            },
            consume: {
                type: "",
                target: "",
                amount: null,
            },
            ability: "",
            actionType: "util",
            attackBonus: 0,
            chatFlavor: "",
            critical: null,
            damage: {
                parts: [],
                versatile: "",
            },
            formula: "",
            save: {
                ability: "",
                dc: null,
                scaling: "spell",
            },
        },
        sort: 0,
        flags: {
            core: {
                sourceId: "Item.wyQkeuZkttllAFB1",
            },

            "midi-qol": {
                onUseMacroName: "",
            },
        },
    };
    ECHItems[game.i18n.localize("enhancedcombathud-dnd5e.items.dodge.name")] = {
        name: game.i18n.localize("enhancedcombathud-dnd5e.items.dodge.name"),
        type: "feat",
        img: "modules/enhancedcombathud/icons/armor-upgrade.webp",
        system: {
            type: {
                value: "",
                subtype: "",
            },
            description: {
                value: game.i18n.localize("enhancedcombathud-dnd5e.items.dodge.desc"),
                chat: "",
                unidentified: "",
            },
            source: "",
            quantity: 1,
            weight: 0,
            price: 0,
            attuned: false,
            attunement: 0,
            equipped: false,
            rarity: "",
            identified: true,
            activation: {
                type: "action",
                cost: 1,
                condition: "",
            },
            duration: {
                value: 1,
                units: "round",
            },
            target: {
                value: null,
                width: null,
                units: "",
                type: "self",
            },
            range: {
                value: null,
                long: null,
                units: "",
            },

            consume: {
                type: "",
                target: "",
                amount: null,
            },
            ability: "",
            actionType: "util",
            attackBonus: 0,
            chatFlavor: "",
            critical: null,
            damage: {
                parts: [],
                versatile: "",
            },
            formula: "",
            save: {
                ability: "",
                dc: null,
                scaling: "spell",
            },
            consumableType: "trinket",
        },
        sort: 0,
        flags: {
            "midi-qol": {
                onUseMacroName: "",
            },
        },
    };
    ECHItems[game.i18n.localize("enhancedcombathud-dnd5e.items.ready.name")] = {
        name: game.i18n.localize("enhancedcombathud-dnd5e.items.ready.name"),
        type: "feat",
        img: "modules/enhancedcombathud/icons/clockwork.webp",
        system: {
            type: {
                value: "",
                subtype: "",
            },
            description: {
                value: game.i18n.localize("enhancedcombathud-dnd5e.items.ready.desc"),
                chat: "",
                unidentified: "",
            },
            source: "",
            quantity: 1,
            weight: 0,
            price: 0,
            attuned: false,
            attunement: 0,
            equipped: false,
            rarity: "",
            identified: true,
            activation: {
                type: "action",
                cost: 1,
                condition: "",
            },
            duration: {
                value: null,
                units: "",
            },
            target: {
                value: null,
                width: null,
                units: "",
                type: "self",
            },
            range: {
                value: null,
                long: null,
                units: "",
            },

            consume: {
                type: "",
                target: "",
                amount: null,
            },
            ability: "",
            actionType: "util",
            attackBonus: 0,
            chatFlavor: "",
            critical: null,
            damage: {
                parts: [],
                versatile: "",
            },
            formula: "",
            save: {
                ability: "",
                dc: null,
                scaling: "spell",
            },
            consumableType: "trinket",
        },
        sort: 0,
        flags: {
            "midi-qol": {
                onUseMacroName: "",
            },
        },
    };
    ECHItems[game.i18n.localize("enhancedcombathud-dnd5e.items.hide.name")] = {
        name: game.i18n.localize("enhancedcombathud-dnd5e.items.hide.name"),
        type: "feat",
        img: "modules/enhancedcombathud/icons/cloak-dagger.webp",
        system: {
            type: {
                value: "",
                subtype: "",
            },
            description: {
                value: game.i18n.localize("enhancedcombathud-dnd5e.items.hide.desc"),
                chat: "",
                unidentified: "",
            },
            source: "",
            quantity: 1,
            weight: 0,
            price: 0,
            attuned: false,
            attunement: 0,
            equipped: false,
            rarity: "",
            identified: true,
            activation: {
                type: "action",
                cost: 1,
                condition: "",
            },
            duration: {
                value: null,
                units: "",
            },
            target: {
                value: null,
                width: null,
                units: "",
                type: "self",
            },
            range: {
                value: null,
                long: null,
                units: "",
            },

            consume: {
                type: "",
                target: "",
                amount: null,
            },
            recharge: {
                value: null,
                charged: false,
            },
            ability: "",
            actionType: "util",
            attackBonus: 0,
            chatFlavor: "",
            critical: null,
            damage: {
                parts: [],
                versatile: "",
            },
            formula: "",
            save: {
                ability: "",
                dc: null,
                scaling: "spell",
            },
            consumableType: "trinket",
        },
        sort: 0,
        flags: {
            "midi-qol": {
                onUseMacroName: "",
            },
        },
    };
    ECHItems[game.i18n.localize("enhancedcombathud-dnd5e.items.dash.name")] = {
        name: game.i18n.localize("enhancedcombathud-dnd5e.items.dash.name"),
        type: "feat",
        img: "modules/enhancedcombathud/icons/walking-boot.webp",
        system: {
            type: {
                value: "",
                subtype: "",
            },
            description: {
                value: game.i18n.localize("enhancedcombathud-dnd5e.items.dash.desc"),
                chat: "",
                unidentified: "",
            },
            source: "",
            quantity: 1,
            weight: 0,
            price: 0,
            attuned: false,
            attunement: 0,
            equipped: false,
            rarity: "",
            identified: true,
            activation: {
                type: "action",
                cost: 1,
                condition: "",
            },
            duration: {
                value: null,
                units: "",
            },
            target: {
                value: null,
                width: null,
                units: "",
                type: "self",
            },
            range: {
                value: null,
                long: null,
                units: "",
            },

            consume: {
                type: "",
                target: "",
                amount: null,
            },
            ability: "",
            actionType: "util",
            attackBonus: 0,
            chatFlavor: "",
            critical: null,
            damage: {
                parts: [],
                versatile: "",
            },
            formula: "",
            save: {
                ability: "",
                dc: null,
                scaling: "spell",
            },
            consumableType: "trinket",
        },
        sort: 0,
        flags: {
            "midi-qol": {
                onUseMacroName: "",
            },
        },
    };
    ECHItems[game.i18n.localize("enhancedcombathud-dnd5e.items.shove.name")] = {
        name: game.i18n.localize("enhancedcombathud-dnd5e.items.shove.name"),
        type: "feat",
        img: "modules/enhancedcombathud/icons/shield-bash.webp",
        system: {
            type: {
                value: "",
                subtype: "",
            },
            description: {
                value: game.i18n.localize("enhancedcombathud-dnd5e.items.shove.desc"),
                chat: "",
                unidentified: "",
            },
            source: "",
            quantity: 1,
            weight: 0,
            price: 0,
            attuned: false,
            attunement: 0,
            equipped: false,
            rarity: "",
            identified: true,
            activation: {
                type: "action",
                cost: 1,
                condition: "",
            },
            duration: {
                value: null,
                units: "",
            },
            target: {
                value: 1,
                width: null,
                units: "",
                type: "creature",
            },
            range: {
                value: null,
                long: null,
                units: "touch",
            },

            consume: {
                type: "",
                target: "",
                amount: null,
            },
            ability: "",
            actionType: "util",
            attackBonus: 0,
            chatFlavor: "",
            critical: null,
            damage: {
                parts: [],
                versatile: "",
            },
            formula: "",
            save: {
                ability: "",
                dc: null,
                scaling: "spell",
            },
            consumableType: "trinket",
        },
        sort: 0,
        flags: {
            "midi-qol": {
                onUseMacroName: "",
            },
        },
    };
}
