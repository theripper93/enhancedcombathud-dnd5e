export class MyApp extends Application {
    constructor() {
        super();
    }

    static get APP_ID() {
        return "app-id";
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: this.APP_ID,
            template: `modules/${MODULE_ID}/templates/${this.APP_ID}.hbs`,
            popOut: true,
            resizable: true,
            minimizable: true,
            width: 400,
            height: 600,
            title: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.title`),
        });
    }

    async getData() {
        const data = {};
        return { data };
    }

    activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;
    }
}