import clear from "clear";
import lockfile from "lockfile";

import { Home } from "./front/menu/home";
import { checkPassword } from "./modules/util/checkPassword";

import logger from "./modules/console/logger";
import SingleInstance from "single-instance";

const locker = new SingleInstance("Tortilla");
locker
    .lock()
    .then(() => {
        logger.log("Starting application");

        start();

        process.on("exit", () => {
            logger.log("Ending application.");
        });
        process.on("uncaughtException", function (err) {
            logger.error("Application Error: " + err.toString());
        });
        process.setMaxListeners(30);
    })
    .catch((err: any) => {
        console.error("Another instance is already running.");
        logger.error("Another instance is already running.");
        process.exit(1);
        // This block will be executed if the app is already running
    });

async function start() {
    await clear();
    await checkPassword();
    Home();
}
