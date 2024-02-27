declare namespace NodeJS {
    interface Process {
        pkg: {
            entrypoint: string;
            defaultEntrypoint: string;
        };
    }
}
declare module "single-instance";
