import ProgressBar from "cli-progress";

class Bar {
    bar: ProgressBar.SingleBar;
    constructor(items: number) {
        this.bar = new ProgressBar.SingleBar({
            format: "Progress [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} | Last Done: {str}\n",
            barCompleteChar: "\u2588",
            barIncompleteChar: "\u2591",
            // hideCursor: true,
        });

        this.bar.start(items, 0);
        this.bar.on("render", () => {
            console.log("GELLO");
        });
    }

    done(str: string) {
        // const initialCursorPosition = process.stdout.getWindowSize()[1];
        // process.stdout.moveCursor(0, -initialCursorPosition);
        process.stdout.write("\r");

        // Clear the line
        // process.stdout.clearLine(0);
        this.bar.increment(1, {
            str: str,
        });
        // process.stdout.moveCursor(0, initialCursorPosition);
    }
    stop() {
        this.bar.stop();
    }
}

export { Bar };
